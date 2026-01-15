@preconcurrency import CarPlay
import CoreLocation
import Foundation
import MapKit
import OSLog

/// Main CarPlay Manager - Handles all CarPlay UI and navigation
@MainActor
final class CarPlayManager: NSObject {
  private let logger = Logger(subsystem: "org.pathfinding.app", category: "CarPlayManager")

  // MARK: - Properties

  private weak var interfaceController: CPInterfaceController?
  private var tabBarTemplate: CPTabBarTemplate?
  private var mapTemplate: CPMapTemplate?

  /// Current selected itinerary
  private var currentItinerary: SavedItinerary?

  /// Current day being displayed
  private var currentDay: Int = 1

  /// Current POI index within the day
  private var currentPOIIndex: Int = 0

  /// Active navigation session
  private var navigationSession: CPNavigationSession?

  /// Store reference for itineraries
  private var itineraryStore: ItineraryStore { ItineraryStore.shared }

  /// Voice command handler
  private lazy var voiceCommandHandler = CarPlayVoiceCommandHandler()

  // MARK: - Initialization

  init(interfaceController: CPInterfaceController) {
    self.interfaceController = interfaceController
    super.init()
    interfaceController.delegate = self
  }

  // MARK: - Setup

  /// Setup the initial CarPlay template
  func setupInitialTemplate() async {
    logger.info("Setting up CarPlay templates")

    // Create tab bar with main sections
    let itineraryTab = createItineraryTab()
    let navigationTab = createNavigationTab()
    let voiceTab = createVoiceTab()

    tabBarTemplate = CPTabBarTemplate(templates: [itineraryTab, navigationTab, voiceTab])
    tabBarTemplate?.delegate = self

    interfaceController?.setRootTemplate(tabBarTemplate!, animated: true) { success, error in
      if let error = error {
        self.logger.error("Failed to set root template: \(error.localizedDescription)")
      } else {
        self.logger.info("CarPlay root template set successfully")
      }
    }
  }

  // MARK: - Tab Creation

  /// Create the itinerary list tab
  private func createItineraryTab() -> CPListTemplate {
    let items = createItineraryListItems()

    let section = CPListSection(items: items, header: "我的行程", sectionIndexTitle: nil)

    let template = CPListTemplate(title: "行程", sections: [section])
    template.tabTitle = "行程"
    template.tabImage = UIImage(systemName: "map")
    template.emptyViewTitleVariants = ["暂无行程"]
    template.emptyViewSubtitleVariants = ["请在手机上创建行程"]

    return template
  }

  /// Create the navigation/map tab
  private func createNavigationTab() -> CPMapTemplate {
    mapTemplate = CPMapTemplate()
    mapTemplate?.tabTitle = "导航"
    mapTemplate?.tabImage = UIImage(systemName: "location.fill")
    mapTemplate?.mapDelegate = self
    mapTemplate?.automaticallyHidesNavigationBar = false
    mapTemplate?.hidesButtonsWithNavigationBar = false

    // Add map buttons
    setupMapButtons()

    return mapTemplate!
  }

  /// Create the voice control tab
  private func createVoiceTab() -> CPListTemplate {
    let voiceItem = CPListItem(
      text: "语音控制",
      detailText: "使用语音指令控制行程",
      image: UIImage(systemName: "mic.fill")
    )
    voiceItem.handler = { [weak self] _, completion in
      self?.startVoiceRecognition()
      completion()
    }

    let helpItems = createVoiceHelpItems()

    let voiceSection = CPListSection(items: [voiceItem], header: "语音输入", sectionIndexTitle: nil)
    let helpSection = CPListSection(items: helpItems, header: "支持的命令", sectionIndexTitle: nil)

    let template = CPListTemplate(title: "语音", sections: [voiceSection, helpSection])
    template.tabTitle = "语音"
    template.tabImage = UIImage(systemName: "mic")

    return template
  }

  // MARK: - Itinerary List Items

  private func createItineraryListItems() -> [CPListItem] {
    return itineraryStore.paginatedItineraries.prefix(12).map { itinerary in
      let daysText = "\(itinerary.days.count)天"
      let poisCount = itinerary.days.reduce(0) { $0 + $1.pois.count }
      let detailText = "\(daysText) | \(poisCount)个景点"

      let item = CPListItem(
        text: itinerary.title,
        detailText: detailText,
        image: UIImage(systemName: "map.fill")
      )

      item.handler = { [weak self] _, completion in
        self?.selectItinerary(itinerary)
        completion()
      }

      item.accessoryType = .disclosureIndicator

      return item
    }
  }

  // MARK: - Voice Help Items

  private func createVoiceHelpItems() -> [CPListItem] {
    let commands = [
      ("下一个", "跳转到下一个景点"),
      ("上一个", "返回上一个景点"),
      ("第N天", "跳转到指定日期"),
      ("开始导航", "导航到当前景点"),
      ("停止导航", "结束导航"),
    ]

    return commands.map { command, description in
      CPListItem(
        text: command,
        detailText: description,
        image: nil
      )
    }
  }

  // MARK: - Map Buttons

  private func setupMapButtons() {
    guard let mapTemplate = mapTemplate else { return }

    // Navigation control buttons
    let prevButton = CPMapButton { [weak self] _ in
      self?.navigateToPreviousPOI()
    }
    prevButton.image = UIImage(systemName: "chevron.left.circle.fill")

    let nextButton = CPMapButton { [weak self] _ in
      self?.navigateToNextPOI()
    }
    nextButton.image = UIImage(systemName: "chevron.right.circle.fill")

    let startNavButton = CPMapButton { [weak self] _ in
      self?.startNavigation()
    }
    startNavButton.image = UIImage(systemName: "arrow.triangle.turn.up.right.diamond.fill")

    mapTemplate.mapButtons = [prevButton, startNavButton, nextButton]

    // Leading navigation bar buttons (pan mode)
    let panButton = CPBarButton(title: "移动") { [weak self] _ in
      self?.mapTemplate?.showPanningInterface(animated: true)
    }
    mapTemplate.leadingNavigationBarButtons = [panButton]

    // Trailing navigation bar buttons (list view)
    let listButton = CPBarButton(title: "列表") { [weak self] _ in
      self?.showPOIList()
    }
    mapTemplate.trailingNavigationBarButtons = [listButton]
  }

  // MARK: - Itinerary Selection

  private func selectItinerary(_ itinerary: SavedItinerary) {
    logger.info("Selected itinerary: \(itinerary.title)")
    currentItinerary = itinerary
    currentDay = 1
    currentPOIIndex = 0

    // Show day selection
    showDaySelection(for: itinerary)
  }

  private func showDaySelection(for itinerary: SavedItinerary) {
    let items = itinerary.days.map { day -> CPListItem in
      let poisCount = day.pois.count
      let theme = day.theme ?? "第\(day.dayNumber)天"

      let item = CPListItem(
        text: "Day \(day.dayNumber)",
        detailText: "\(theme) | \(poisCount)个景点",
        image: UIImage(systemName: "\(day.dayNumber).circle.fill")
      )

      item.handler = { [weak self] _, completion in
        self?.selectDay(day.dayNumber, in: itinerary)
        completion()
      }

      return item
    }

    let section = CPListSection(items: items, header: itinerary.title, sectionIndexTitle: nil)
    let template = CPListTemplate(title: itinerary.title, sections: [section])

    interfaceController?.pushTemplate(template, animated: true) { _, error in
      if let error = error {
        self.logger.error("Failed to push day selection: \(error.localizedDescription)")
      }
    }
  }

  private func selectDay(_ dayNumber: Int, in itinerary: SavedItinerary) {
    logger.info("Selected day \(dayNumber)")
    currentDay = dayNumber
    currentPOIIndex = 0

    // Show POI list for this day
    showPOIListForDay(dayNumber, in: itinerary)
  }

  private func showPOIListForDay(_ dayNumber: Int, in itinerary: SavedItinerary) {
    guard let day = itinerary.days.first(where: { $0.dayNumber == dayNumber }) else { return }

    let items = day.pois.enumerated().map { index, poi -> CPListItem in
      let item = CPListItem(
        text: "\(index + 1). \(poi.name)",
        detailText: poi.type ?? poi.address ?? "",
        image: imageForPOIType(poi.type)
      )

      item.handler = { [weak self] _, completion in
        self?.currentPOIIndex = index
        self?.showPOIDetail(poi, at: index)
        completion()
      }

      item.accessoryType = .disclosureIndicator

      return item
    }

    let section = CPListSection(
      items: items, header: "Day \(dayNumber) - \(day.theme ?? "")", sectionIndexTitle: nil)
    let template = CPListTemplate(title: "Day \(dayNumber)", sections: [section])

    // Add navigation button to go directly to map
    let mapButton = CPBarButton(title: "地图") { [weak self] _ in
      self?.switchToMapWithCurrentPOI()
    }
    template.trailingNavigationBarButtons = [mapButton]

    interfaceController?.pushTemplate(template, animated: true) { _, _ in }
  }

  // MARK: - POI Detail

  private func showPOIDetail(_ poi: AiPoi, at index: Int) {
    var sections: [CPListSection] = []

    // Basic info
    var infoItems: [CPListItem] = []

    if let address = poi.address {
      let addressItem = CPListItem(
        text: "地址",
        detailText: address,
        image: UIImage(systemName: "mappin.circle")
      )
      infoItems.append(addressItem)
    }

    if let duration = poi.duration {
      let durationItem = CPListItem(
        text: "建议停留",
        detailText: duration,
        image: UIImage(systemName: "clock")
      )
      infoItems.append(durationItem)
    }

    if let priceInfo = poi.priceInfo {
      let priceItem = CPListItem(
        text: "费用",
        detailText: priceInfo,
        image: UIImage(systemName: "yensign.circle")
      )
      infoItems.append(priceItem)
    }

    if let openingHours = poi.openingHours {
      let hoursItem = CPListItem(
        text: "营业时间",
        detailText: openingHours,
        image: UIImage(systemName: "clock.badge.checkmark")
      )
      infoItems.append(hoursItem)
    }

    if !infoItems.isEmpty {
      sections.append(CPListSection(items: infoItems, header: "详情", sectionIndexTitle: nil))
    }

    // Navigation action
    if poi.latitude != nil && poi.longitude != nil {
      let navItem = CPListItem(
        text: "开始导航",
        detailText: "使用苹果地图导航到此景点",
        image: UIImage(systemName: "arrow.triangle.turn.up.right.diamond.fill")
      )
      navItem.handler = { [weak self] _, completion in
        self?.startNavigationToPOI(poi)
        completion()
      }

      let showOnMapItem = CPListItem(
        text: "在地图上显示",
        detailText: "切换到地图视图",
        image: UIImage(systemName: "map")
      )
      showOnMapItem.handler = { [weak self] _, completion in
        self?.switchToMapWithPOI(poi)
        completion()
      }

      sections.append(
        CPListSection(items: [navItem, showOnMapItem], header: "导航", sectionIndexTitle: nil))
    }

    let template = CPListTemplate(title: poi.name, sections: sections)
    interfaceController?.pushTemplate(template, animated: true) { _, _ in }
  }

  // MARK: - POI List View

  private func showPOIList() {
    guard let itinerary = currentItinerary,
      itinerary.days.first(where: { $0.dayNumber == currentDay }) != nil
    else { return }

    showPOIListForDay(currentDay, in: itinerary)
  }

  // MARK: - Navigation

  private func switchToMapWithCurrentPOI() {
    guard let itinerary = currentItinerary,
      let day = itinerary.days.first(where: { $0.dayNumber == currentDay }),
      currentPOIIndex < day.pois.count
    else { return }

    let poi = day.pois[currentPOIIndex]
    switchToMapWithPOI(poi)
  }

  private func switchToMapWithPOI(_ poi: AiPoi) {
    // Switch to map tab - selectedTemplate is read-only, use delegate method instead
    // tabBarTemplate?.selectedTemplate = mapTemplate

    // Update trip info
    updateTripInfo(for: poi)

    // Pop to root if needed
    interfaceController?.popToRootTemplate(animated: true) { _, _ in }
  }

  private func updateTripInfo(for poi: AiPoi) {
    guard let lat = poi.latitude, let lng = poi.longitude else { return }

    _ = CPTravelEstimates(
      distanceRemaining: Measurement(value: 0, unit: UnitLength.meters),
      timeRemaining: 0
    )

    // Create point of interest item
    let poiItem = CPPointOfInterest(
      location: MKMapItem(
        placemark: MKPlacemark(
          coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
        )
      ),
      title: poi.name,
      subtitle: poi.type,
      summary: poi.address,
      detailTitle: poi.name,
      detailSubtitle: poi.description,
      detailSummary: nil,
      pinImage: nil
    )

    poiItem.primaryButton = CPTextButton(
      title: "导航",
      textStyle: .normal
    ) { [weak self] _ in
      self?.startNavigationToPOI(poi)
    }

    // Show trip previews
    if let mapTemplate = mapTemplate {
      let tripPreview = CPTrip(
        origin: MKMapItem.forCurrentLocation(),
        destination: MKMapItem(
          placemark: MKPlacemark(
            coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng)
          )
        ),
        routeChoices: []
      )

      // Show navigation banner
      let textConfiguration = CPTripPreviewTextConfiguration(
        startButtonTitle: "开始导航",
        additionalRoutesButtonTitle: nil,
        overviewButtonTitle: nil
      )

      mapTemplate.showTripPreviews([tripPreview], textConfiguration: textConfiguration)
    }
  }

  private func startNavigationToPOI(_ poi: AiPoi) {
    guard let lat = poi.latitude, let lng = poi.longitude else {
      logger.warning("Cannot navigate: POI has no coordinates")
      return
    }

    logger.info("Starting navigation to: \(poi.name)")

    // Use Apple Maps for navigation
    let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
    let placemark = MKPlacemark(coordinate: coordinate)
    let mapItem = MKMapItem(placemark: placemark)
    mapItem.name = poi.name

    mapItem.openInMaps(launchOptions: [
      MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault
    ])

    NotificationCenter.default.post(name: .carPlayNavigationStarted, object: poi)
  }

  private func startNavigation() {
    guard let itinerary = currentItinerary,
      let day = itinerary.days.first(where: { $0.dayNumber == currentDay }),
      currentPOIIndex < day.pois.count
    else { return }

    let poi = day.pois[currentPOIIndex]
    startNavigationToPOI(poi)
  }

  // MARK: - POI Navigation (Previous/Next)

  private func navigateToNextPOI() {
    guard let itinerary = currentItinerary,
      let day = itinerary.days.first(where: { $0.dayNumber == currentDay })
    else { return }

    if currentPOIIndex < day.pois.count - 1 {
      currentPOIIndex += 1
      let poi = day.pois[currentPOIIndex]
      updateTripInfo(for: poi)
      showNextPOIAlert(poi, index: currentPOIIndex + 1)
    } else if currentDay < itinerary.days.count {
      // Move to next day
      currentDay += 1
      currentPOIIndex = 0
      if let nextDay = itinerary.days.first(where: { $0.dayNumber == currentDay }),
        !nextDay.pois.isEmpty
      {
        let poi = nextDay.pois[0]
        updateTripInfo(for: poi)
        showDayChangeAlert(day: currentDay, poi: poi)
      }
    }
  }

  private func navigateToPreviousPOI() {
    guard let itinerary = currentItinerary else { return }

    if currentPOIIndex > 0 {
      currentPOIIndex -= 1
      if let day = itinerary.days.first(where: { $0.dayNumber == currentDay }) {
        let poi = day.pois[currentPOIIndex]
        updateTripInfo(for: poi)
        showNextPOIAlert(poi, index: currentPOIIndex + 1)
      }
    } else if currentDay > 1 {
      // Move to previous day
      currentDay -= 1
      if let prevDay = itinerary.days.first(where: { $0.dayNumber == currentDay }) {
        currentPOIIndex = max(0, prevDay.pois.count - 1)
        if !prevDay.pois.isEmpty {
          let poi = prevDay.pois[currentPOIIndex]
          updateTripInfo(for: poi)
          showDayChangeAlert(day: currentDay, poi: poi)
        }
      }
    }
  }

  private func showNextPOIAlert(_ poi: AiPoi, index: Int) {
    let alert = CPNavigationAlert(
      titleVariants: ["\(index). \(poi.name)"],
      subtitleVariants: [poi.type ?? ""],
      imageSet: nil,
      primaryAction: CPAlertAction(
        title: "导航",
        style: .default
      ) { [weak self] _ in
        self?.startNavigationToPOI(poi)
      },
      secondaryAction: CPAlertAction(title: "取消", style: .cancel) { _ in },
      duration: 5.0
    )

    mapTemplate?.present(navigationAlert: alert, animated: true)
  }

  private func showDayChangeAlert(day: Int, poi: AiPoi) {
    let alert = CPNavigationAlert(
      titleVariants: ["第\(day)天"],
      subtitleVariants: ["1. \(poi.name)"],
      imageSet: nil,
      primaryAction: CPAlertAction(
        title: "导航",
        style: .default
      ) { [weak self] _ in
        self?.startNavigationToPOI(poi)
      },
      secondaryAction: CPAlertAction(title: "取消", style: .cancel) { _ in },
      duration: 5.0
    )

    mapTemplate?.present(navigationAlert: alert, animated: true)
  }

  // MARK: - Voice Recognition

  private func startVoiceRecognition() {
    logger.info("Starting voice recognition")

    Task {
      let result = await voiceCommandHandler.startListening()

      switch result {
      case .success(let command):
        handleVoiceCommand(command)
      case .failure(let error):
        logger.error("Voice recognition failed: \(error.localizedDescription)")
        showVoiceError()
      }
    }
  }

  private func handleVoiceCommand(_ command: VoiceCommand) {
    logger.info("Voice command received: \(command.description)")

    switch command {
    case .navigation(.next):
      navigateToNextPOI()

    case .navigation(.previous):
      navigateToPreviousPOI()

    case .navigation(.goToDay(let day)):
      if let itinerary = currentItinerary, day <= itinerary.days.count, day > 0 {
        currentDay = day
        currentPOIIndex = 0
        if let dayData = itinerary.days.first(where: { $0.dayNumber == day }),
          !dayData.pois.isEmpty
        {
          let poi = dayData.pois[0]
          updateTripInfo(for: poi)
          showDayChangeAlert(day: day, poi: poi)
        }
      }

    case .navigation(.goToPOI(let poiIndex)):
      if let itinerary = currentItinerary,
        let day = itinerary.days.first(where: { $0.dayNumber == currentDay }),
        poiIndex > 0 && poiIndex <= day.pois.count
      {
        currentPOIIndex = poiIndex - 1
        let poi = day.pois[currentPOIIndex]
        updateTripInfo(for: poi)
        showNextPOIAlert(poi, index: poiIndex)
      }

    case .search(let query):
      logger.info("Search command: \(query)")
      // Search not fully implemented in CarPlay - show alert
      showSearchNotSupportedAlert()

    default:
      logger.info("Unhandled voice command: \(command.description)")
    }
  }

  private func showVoiceError() {
    let alert = CPNavigationAlert(
      titleVariants: ["语音识别失败"],
      subtitleVariants: ["请重试"],
      imageSet: nil,
      primaryAction: CPAlertAction(title: "重试", style: .default) { [weak self] _ in
        self?.startVoiceRecognition()
      },
      secondaryAction: CPAlertAction(title: "取消", style: .cancel) { _ in },
      duration: 3.0
    )

    mapTemplate?.present(navigationAlert: alert, animated: true)
  }

  private func showSearchNotSupportedAlert() {
    let alert = CPNavigationAlert(
      titleVariants: ["搜索功能"],
      subtitleVariants: ["请在手机上进行搜索"],
      imageSet: nil,
      primaryAction: CPAlertAction(title: "好的", style: .default) { _ in },
      secondaryAction: nil,
      duration: 3.0
    )

    mapTemplate?.present(navigationAlert: alert, animated: true)
  }

  // MARK: - Helper Methods

  private func imageForPOIType(_ type: String?) -> UIImage? {
    switch type?.lowercased() {
    case "景点", "attraction":
      return UIImage(systemName: "star.circle.fill")
    case "餐厅", "restaurant", "美食", "food":
      return UIImage(systemName: "fork.knife.circle.fill")
    case "酒店", "hotel", "住宿", "accommodation":
      return UIImage(systemName: "bed.double.circle.fill")
    case "交通", "transport", "transportation":
      return UIImage(systemName: "car.circle.fill")
    case "购物", "shopping":
      return UIImage(systemName: "bag.circle.fill")
    default:
      return UIImage(systemName: "mappin.circle.fill")
    }
  }

  // MARK: - Refresh Data

  func refreshItineraryList() {
    guard let tabBarTemplate = tabBarTemplate,
      let itineraryTab = tabBarTemplate.templates.first as? CPListTemplate
    else { return }

    let items = createItineraryListItems()
    let section = CPListSection(items: items, header: "我的行程", sectionIndexTitle: nil)

    itineraryTab.updateSections([section])
  }
}

// MARK: - CPInterfaceControllerDelegate

extension CarPlayManager: CPInterfaceControllerDelegate {
  nonisolated func templateWillAppear(
    _ aTemplate: CPTemplate, animated: Bool
  ) {
    // Template will appear
  }

  nonisolated func templateDidAppear(
    _ aTemplate: CPTemplate, animated: Bool
  ) {
    // Template did appear
  }

  nonisolated func templateWillDisappear(
    _ aTemplate: CPTemplate, animated: Bool
  ) {
    // Template will disappear
  }

  nonisolated func templateDidDisappear(
    _ aTemplate: CPTemplate, animated: Bool
  ) {
    // Template did disappear
  }
}

// MARK: - CPTabBarTemplateDelegate

extension CarPlayManager: CPTabBarTemplateDelegate {
  nonisolated func tabBarTemplate(
    _ tabBarTemplate: CPTabBarTemplate, didSelect selectedTemplate: CPTemplate
  ) {
    // Handle tab selection if needed
  }
}

// MARK: - CPMapTemplateDelegate

extension CarPlayManager: CPMapTemplateDelegate {
  nonisolated func mapTemplate(
    _ mapTemplate: CPMapTemplate, panWith direction: CPMapTemplate.PanDirection
  ) {
    // Handle map panning
  }

  nonisolated func mapTemplateDidShowPanningInterface(_ mapTemplate: CPMapTemplate) {
    // Panning interface shown
  }

  nonisolated func mapTemplateDidDismissPanningInterface(_ mapTemplate: CPMapTemplate) {
    // Panning interface dismissed
  }

  nonisolated func mapTemplate(_ mapTemplate: CPMapTemplate, didEndPanGestureWithVelocity velocity: CGPoint) {
    // Pan gesture ended
  }

  nonisolated func mapTemplate(
    _ mapTemplate: CPMapTemplate, startedTrip trip: CPTrip, using routeChoice: CPRouteChoice
  ) {
    MainActor.assumeIsolated {
      // Start navigation session
      navigationSession = mapTemplate.startNavigationSession(for: trip)
      navigationSession?.pauseTrip(for: .loading, description: "加载中...")
    }
  }

  nonisolated func mapTemplate(_ mapTemplate: CPMapTemplate, selectedPreviewFor trip: CPTrip, using routeChoice: CPRouteChoice) {
    // Route selected
  }

  nonisolated func mapTemplateDidCancelNavigation(_ mapTemplate: CPMapTemplate) {
    Task { @MainActor in
      navigationSession = nil
      NotificationCenter.default.post(name: .carPlayNavigationEnded, object: nil)
    }
  }
}

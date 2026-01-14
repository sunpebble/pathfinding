import AppIntents
import WidgetKit

/// Configuration intent for all Pathfinding widgets
struct ConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "配置小组件"
  static var description = IntentDescription("自定义探路小组件的显示方式")

  // Future: Add configuration options like preferred currency pair, temperature unit, etc.
}

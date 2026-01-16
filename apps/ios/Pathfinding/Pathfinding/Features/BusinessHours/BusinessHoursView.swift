import SwiftUI

// MARK: - Business Hours View

/// Main view for displaying POI business hours
struct BusinessHoursView: View {
  let businessHours: BusinessHours?
  let openStatus: OpenStatus?
  let bestVisitTime: BestVisitTime?
  let holidayHours: [HolidayHours]?

  @State private var isExpanded = false

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      // Open Status Header
      if let status = openStatus {
        OpenStatusBadge(status: status)
      }

      // Quick Hours Summary
      if let hours = businessHours, hours.hasHours {
        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            isExpanded.toggle()
          }
        } label: {
          HStack {
            Image(systemName: "clock")
              .foregroundStyle(.secondary)

            if let todayHours = openStatus?.todayHours, !todayHours.isEmpty {
              Text("今日: \(todayHours.map(\.displayString).joined(separator: ", "))")
                .font(.subheadline)
            } else {
              Text("今日休息")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .contentShape(Rectangle())
        }
        .buttonStyle(.plain)

        // Expanded Weekly Hours
        if isExpanded {
          WeeklyHoursView(businessHours: hours)
            .transition(.opacity.combined(with: .move(edge: .top)))
        }
      }

      // Holiday Hours Alert
      if let holidays = holidayHours, !holidays.isEmpty {
        HolidayHoursAlert(holidays: holidays)
      }

      // Best Visit Time
      if let bestTime = bestVisitTime {
        BestVisitTimeView(bestVisitTime: bestTime)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(DesignTokens.Colors.cardBackground)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }
}

// MARK: - Open Status Badge

struct OpenStatusBadge: View {
  let status: OpenStatus

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.xs) {
      // Status indicator
      Circle()
        .fill(status.isOpen ? Color.green : Color.red)
        .frame(width: 8, height: 8)

      Text(status.isOpen ? "营业中" : "已关门")
        .font(.subheadline)
        .fontWeight(.semibold)
        .foregroundStyle(status.isOpen ? .green : .red)

      // Next status change
      if status.isOpen, let closeTime = status.nextCloseTime {
        Text("· \(closeTime) 关门")
          .font(.caption)
          .foregroundStyle(.secondary)
      } else if !status.isOpen, let openTime = status.nextOpenTime {
        Text("· \(openTime) 开门")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      // Holiday indicator
      if let holiday = status.holidayInfo {
        HStack(spacing: 4) {
          Image(systemName: "calendar.badge.clock")
            .font(.caption)
          Text(holiday.holidayName)
            .font(.caption)
        }
        .foregroundStyle(.orange)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.orange.opacity(0.1))
        .clipShape(Capsule())
      }
    }
  }
}

// MARK: - Weekly Hours View

struct WeeklyHoursView: View {
  let businessHours: BusinessHours

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      ForEach(DayOfWeek.allCases) { day in
        HStack {
          Text(day.localizedName)
            .font(.subheadline)
            .foregroundStyle(day == .today ? .primary : .secondary)
            .fontWeight(day == .today ? .semibold : .regular)
            .frame(width: 40, alignment: .leading)

          if let hours = businessHours.hours(for: day), !hours.isEmpty {
            Text(hours.map(\.displayString).joined(separator: ", "))
              .font(.subheadline)
              .foregroundStyle(day == .today ? .primary : .secondary)
          } else {
            Text("休息")
              .font(.subheadline)
              .foregroundStyle(.tertiary)
          }

          Spacer()

          if day == .today {
            Text("今天")
              .font(.caption2)
              .fontWeight(.medium)
              .foregroundStyle(.white)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.accentColor)
              .clipShape(Capsule())
          }
        }
        .padding(.vertical, 4)

        if day != .saturday {
          Divider()
        }
      }

      // Notes
      if let notes = businessHours.notes, !notes.isEmpty {
        HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "info.circle")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(notes)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.top, DesignTokens.Spacing.xs)
      }
    }
    .padding(.top, DesignTokens.Spacing.xs)
  }
}

// MARK: - Holiday Hours Alert

struct HolidayHoursAlert: View {
  let holidays: [HolidayHours]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      ForEach(holidays) { holiday in
        HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
          Image(systemName: "calendar.badge.exclamationmark")
            .foregroundStyle(.orange)

          VStack(alignment: .leading, spacing: 2) {
            HStack {
              Text(holiday.holidayName)
                .font(.subheadline)
                .fontWeight(.medium)

              if let nameEn = holiday.holidayNameEn {
                Text("(\(nameEn))")
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }

            Text("\(holiday.startDate) - \(holiday.endDate)")
              .font(.caption)
              .foregroundStyle(.secondary)

            if holiday.isClosed {
              Text("休息")
                .font(.caption)
                .foregroundStyle(.red)
            } else if let hours = holiday.hours, !hours.isEmpty {
              Text("营业时间: \(hours.map(\.displayString).joined(separator: ", "))")
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            if let notes = holiday.notes, !notes.isEmpty {
              Text(notes)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(DesignTokens.Spacing.sm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
      }
    }
  }
}

// MARK: - Best Visit Time View

struct BestVisitTimeView: View {
  let bestVisitTime: BestVisitTime
  @State private var isExpanded = false

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Button {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
          isExpanded.toggle()
        }
      } label: {
        HStack {
          Image(systemName: "star.fill")
            .foregroundStyle(.yellow)

          Text("最佳访问时间")
            .font(.subheadline)
            .fontWeight(.medium)

          if let time = bestVisitTime.recommendedTime {
            Text(time)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          Spacer()

          Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)

      if isExpanded {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
          // Reason
          if let reason = bestVisitTime.reason, !reason.isEmpty {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "lightbulb")
                .font(.caption)
                .foregroundStyle(.yellow)
              Text(reason)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }

          // Peak Hours
          if let peakHours = bestVisitTime.peakHours, !peakHours.isEmpty {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "person.3.fill")
                .font(.caption)
                .foregroundStyle(.orange)
              VStack(alignment: .leading, spacing: 2) {
                Text("高峰时段")
                  .font(.caption)
                  .fontWeight(.medium)
                Text(peakHours.joined(separator: ", "))
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }

          // Avoid Times
          if let avoidTimes = bestVisitTime.avoidTimes, !avoidTimes.isEmpty {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "exclamationmark.triangle")
                .font(.caption)
                .foregroundStyle(.red)
              VStack(alignment: .leading, spacing: 2) {
                Text("建议避开")
                  .font(.caption)
                  .fontWeight(.medium)
                Text(avoidTimes.joined(separator: ", "))
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }

          // Seasonal Notes
          if let seasonalNotes = bestVisitTime.seasonalNotes, !seasonalNotes.isEmpty {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
              Image(systemName: "leaf")
                .font(.caption)
                .foregroundStyle(.green)
              Text(seasonalNotes)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
        .padding(.leading, DesignTokens.Spacing.lg)
        .transition(.opacity.combined(with: .move(edge: .top)))
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .background(Color.yellow.opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.xs))
  }
}

// MARK: - Compact Business Hours Badge

/// A compact badge showing open/closed status
struct BusinessHoursCompactBadge: View {
  let isOpen: Bool
  let nextChangeTime: String?

  var body: some View {
    HStack(spacing: 4) {
      Circle()
        .fill(isOpen ? Color.green : Color.red)
        .frame(width: 6, height: 6)

      Text(isOpen ? "营业中" : "已关门")
        .font(.caption2)
        .fontWeight(.medium)

      if let time = nextChangeTime {
        Text("· \(time)")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(isOpen ? Color.green.opacity(0.1) : Color.red.opacity(0.1))
    .clipShape(Capsule())
  }
}

// MARK: - Preview

#Preview("Business Hours View") {
  ScrollView {
    VStack(spacing: 20) {
      BusinessHoursView(
        businessHours: BusinessHours(
          monday: [TimeSlot(open: "09:00", close: "18:00")],
          tuesday: [TimeSlot(open: "09:00", close: "18:00")],
          wednesday: [TimeSlot(open: "09:00", close: "18:00")],
          thursday: [TimeSlot(open: "09:00", close: "18:00")],
          friday: [TimeSlot(open: "09:00", close: "21:00")],
          saturday: [TimeSlot(open: "10:00", close: "22:00")],
          sunday: nil,
          timezone: "Asia/Shanghai",
          notes: "节假日营业时间可能有所调整"
        ),
        openStatus: OpenStatus(
          isOpen: true,
          nextOpenTime: nil,
          nextCloseTime: "18:00",
          currentDay: "monday",
          todayHours: [TimeSlot(open: "09:00", close: "18:00")],
          holidayInfo: nil
        ),
        bestVisitTime: BestVisitTime(
          recommendedTime: "09:00-11:00",
          reason: "早上人少，可以更好地欣赏风景",
          avoidTimes: ["12:00-14:00", "17:00-19:00"],
          peakHours: ["10:00-12:00", "14:00-16:00"],
          seasonalNotes: "春季樱花盛开，建议3-4月前往"
        ),
        holidayHours: [
          HolidayHours(
            id: "1",
            poiId: "poi1",
            holidayName: "春节",
            holidayNameEn: "Chinese New Year",
            startDate: "2024-02-10",
            endDate: "2024-02-17",
            isClosed: false,
            hours: [TimeSlot(open: "10:00", close: "16:00")],
            notes: "春节期间缩短营业时间",
            isRecurring: true
          )
        ]
      )

      BusinessHoursCompactBadge(isOpen: true, nextChangeTime: "18:00 关门")
      BusinessHoursCompactBadge(isOpen: false, nextChangeTime: "明天 09:00")
    }
    .padding()
  }
  .background(DesignTokens.Colors.backgroundGrouped)
}

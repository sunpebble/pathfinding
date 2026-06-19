import SwiftUI

// MARK: - Practical Tab

struct PracticalTab: View {
  let encyclopedia: CityEncyclopedia

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if let info = encyclopedia.practicalInfo {
        // Emergency Numbers
        emergencyNumbersSection(info)

        // Currency & Money
        currencySection(info)

        // Language
        languageSection(info)

        // Electricity & Water
        utilitiesSection(info)

        // Visa
        if let visaRequired = info.visaRequired {
          visaSection(required: visaRequired, note: info.visaNote)
        }

        // Tipping
        tippingSection(info)
      } else {
        EncyclopediaEmptyState(
          icon: "info.circle.fill",
          title: "暂无实用信息",
          subtitle: "该城市尚未添加实用信息数据"
        )
      }
    }
  }

  private func emergencyNumbersSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("紧急电话", systemImage: "phone.fill")
        .font(.headline)
        .foregroundStyle(.red)

      HStack(spacing: DesignTokens.Spacing.sm) {
        emergencyButton(icon: "shield.fill", label: "报警", number: info.emergencyNumber, color: .blue)
        emergencyButton(
          icon: "cross.fill", label: "急救", number: info.ambulanceNumber, color: .red)
        emergencyButton(icon: "flame.fill", label: "消防", number: info.fireNumber, color: .orange)
      }

      if let hotline = info.touristHotline {
        HStack {
          Image(systemName: "person.wave.2.fill")
            .foregroundStyle(.purple)
          Text("旅游热线: \(hotline)")
            .font(.subheadline)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface(tint: .red.opacity(0.15))
  }

  private func emergencyButton(icon: String, label: String, number: String, color: Color)
    -> some View
  {
    Button {
      if let url = URL(string: "tel:\(number)") {
        UIApplication.shared.open(url)
      }
    } label: {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.title3)
        Text(label)
          .font(.caption2)
        Text(number)
          .font(.caption)
          .fontWeight(.bold)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .foregroundStyle(color)
    }
    .buttonStyle(.glass)
    .accessibilityLabel("\(label): \(number)")
  }

  private func currencySection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("货币信息", systemImage: "dollarsign.circle.fill")
        .font(.headline)
        .foregroundStyle(.green)

      HStack {
        VStack(alignment: .leading) {
          Text("货币代码")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(info.currency)
            .font(.title2)
            .fontWeight(.bold)
        }

        Spacer()

        VStack(alignment: .trailing) {
          Text("符号")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(info.currencySymbol)
            .font(.title2)
            .fontWeight(.bold)
        }
      }

      Divider()

      HStack {
        Text("当地名称: \(info.currencyNameLocal)")
          .font(.caption)
        Spacer()
        Text("英文: \(info.currencyNameEn)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }

  private func languageSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("语言", systemImage: "textformat")
        .font(.headline)

      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("官方语言:")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text(info.languageOfficial.joined(separator: ", "))
            .font(.subheadline)
        }

        HStack {
          Text("常用语言:")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text(info.languageCommon.joined(separator: ", "))
            .font(.subheadline)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardSurface()
  }

  private func utilitiesSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("电力与饮水", systemImage: "bolt.fill")
        .font(.headline)
        .foregroundStyle(.yellow)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "bolt.fill")
              .foregroundStyle(.yellow)
            Text("电压")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Text(info.voltage)
            .font(.subheadline)
            .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)

        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "powerplug.fill")
              .foregroundStyle(.yellow)
            Text("插头类型")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Text(info.formattedPlugTypes)
            .font(.subheadline)
            .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)
      }

      // Water safety
      HStack {
        Image(systemName: info.waterSafety.icon)
          .foregroundStyle(.blue)
        VStack(alignment: .leading) {
          Text("饮用水: \(info.waterSafety.displayName)")
            .font(.subheadline)
          if let note = info.waterSafetyNote {
            Text(note)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }

  private func visaSection(required: Bool, note: String?) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("签证信息", systemImage: "doc.text.fill")
        .font(.headline)
        .foregroundStyle(required ? .orange : .green)

      HStack {
        Image(systemName: required ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
          .foregroundStyle(required ? .orange : .green)
        Text(required ? "需要签证" : "免签或落地签")
          .font(.subheadline)
      }

      if let note = note {
        Text(note)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardSurface()
  }

  private func tippingSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("小费习惯", systemImage: "hand.thumbsup.fill")
        .font(.headline)
        .foregroundStyle(.purple)

      Text(info.tippingCustom)
        .font(.subheadline)
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardSurface()
  }
}

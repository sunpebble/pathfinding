import SwiftUI

// MARK: - API Settings Sheet

struct APISettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var apiURL = AppConfig.apiBaseURL

  var body: some View {
    Form {
      Section("api.server".localized) {
        TextField("api.url_placeholder".localized, text: $apiURL)
          .textInputAutocapitalization(.never)
          .keyboardType(.URL)
      }

      Section {
        Text(String(format: "api.current_environment".localized, AppConfig.Environment.current.rawValue.capitalized))
          .foregroundStyle(.secondary)
      } footer: {
        Text("api.restart_hint".localized)
      }
    }
    .navigationTitle("api.title".localized)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("common.save".localized) {
          // Save to UserDefaults
          dismiss()
        }
        .fontWeight(.semibold)
      }
    }
  }
}

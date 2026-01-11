import SwiftUI

/// Fullscreen image viewer with zoom and swipe gestures
struct ImageViewer: View {
  let images: [String]
  @Binding var selectedIndex: Int
  @Binding var isPresented: Bool

  @State private var currentScale: CGFloat = 1
  @State private var currentOffset: CGSize = .zero
  @State private var dismissOffset: CGFloat = 0

  var body: some View {
    ZStack {
      // Background
      Color.black
        .ignoresSafeArea()
        .opacity(max(0.4, 1.0 - abs(dismissOffset) / 400.0))

      // Main content
      if currentScale <= 1 {
        // Normal mode: TabView for swiping between images
        TabView(selection: $selectedIndex) {
          ForEach(Array(images.enumerated()), id: \.offset) { index, imageUrl in
            ZoomableImage(
              url: imageUrl,
              scale: $currentScale,
              offset: $currentOffset
            )
            .tag(index)
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
        .offset(y: dismissOffset)
        .gesture(dismissDragGesture)
      } else {
        // Zoomed mode: Show single image with pan
        ZoomableImage(
          url: images[selectedIndex],
          scale: $currentScale,
          offset: $currentOffset
        )
      }

      // Controls overlay
      controlsOverlay
    }
    .statusBarHidden()
    .onChange(of: selectedIndex) { _, _ in
      resetZoom()
    }
  }

  // MARK: - Controls Overlay

  private var controlsOverlay: some View {
    VStack {
      // Top bar
      HStack {
        if images.count > 1 {
          Text("\(selectedIndex + 1) / \(images.count)")
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(.black.opacity(0.5))
            .clipShape(Capsule())
        }

        Spacer()

        Button {
          close()
        } label: {
          Image(systemName: "xmark")
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .frame(width: 32, height: 32)
            .background(.black.opacity(0.5))
            .clipShape(Circle())
        }
      }
      .padding()

      Spacer()

      // Page dots
      if images.count > 1 && currentScale <= 1 {
        HStack(spacing: 8) {
          ForEach(0..<images.count, id: \.self) { index in
            Circle()
              .fill(index == selectedIndex ? Color.white : Color.white.opacity(0.4))
              .frame(width: 8, height: 8)
          }
        }
        .padding(.bottom, 50)
        .transition(.opacity)
      }
    }
    .animation(.easeOut(duration: 0.2), value: currentScale <= 1)
  }

  // MARK: - Dismiss Gesture

  private var dismissDragGesture: some Gesture {
    DragGesture(minimumDistance: 20)
      .onChanged { value in
        // Only allow vertical dismiss when not zoomed
        if abs(value.translation.height) > abs(value.translation.width) {
          dismissOffset = value.translation.height
        }
      }
      .onEnded { value in
        if abs(value.translation.height) > 120 || abs(value.velocity.height) > 500 {
          close()
        } else {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            dismissOffset = 0
          }
        }
      }
  }

  // MARK: - Helpers

  private func resetZoom() {
    withAnimation(.easeOut(duration: 0.2)) {
      currentScale = 1
      currentOffset = .zero
    }
  }

  private func close() {
    withAnimation(.easeOut(duration: 0.2)) {
      isPresented = false
    }
  }
}

// MARK: - Zoomable Image

struct ZoomableImage: View {
  let url: String
  @Binding var scale: CGFloat
  @Binding var offset: CGSize

  @State private var lastScale: CGFloat = 1
  @State private var lastOffset: CGSize = .zero
  @GestureState private var magnifyScale: CGFloat = 1

  var body: some View {
    GeometryReader { geo in
      CachedAsyncImage(url: URL(string: url)) { image in
        image
          .resizable()
          .aspectRatio(contentMode: .fit)
          .scaleEffect(scale * magnifyScale)
          .offset(x: offset.width, y: offset.height)
          .position(x: geo.size.width / 2, y: geo.size.height / 2)
          .gesture(doubleTapGesture)
          .gesture(magnifyGesture)
          .simultaneousGesture(scale > 1 ? panGesture : nil)
      } placeholder: {
        ProgressView()
          .tint(.white)
          .frame(width: geo.size.width, height: geo.size.height)
      }
    }
  }

  // Double tap to zoom in/out
  private var doubleTapGesture: some Gesture {
    TapGesture(count: 2)
      .onEnded {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
          if scale > 1 {
            scale = 1
            offset = .zero
            lastScale = 1
            lastOffset = .zero
          } else {
            scale = 2.5
            lastScale = 2.5
          }
        }
      }
  }

  // Pinch to zoom
  private var magnifyGesture: some Gesture {
    MagnifyGesture()
      .updating($magnifyScale) { value, state, _ in
        state = value.magnification
      }
      .onEnded { value in
        let newScale = lastScale * value.magnification
        withAnimation(.spring(response: 0.25, dampingFraction: 0.8)) {
          if newScale < 1 {
            scale = 1
            offset = .zero
            lastScale = 1
            lastOffset = .zero
          } else {
            scale = min(newScale, 5)
            lastScale = scale
          }
        }
      }
  }

  // Pan when zoomed
  private var panGesture: some Gesture {
    DragGesture()
      .onChanged { value in
        offset = CGSize(
          width: lastOffset.width + value.translation.width,
          height: lastOffset.height + value.translation.height
        )
      }
      .onEnded { _ in
        lastOffset = offset
      }
  }
}

// MARK: - View Modifier

struct ImageViewerModifier: ViewModifier {
  let images: [String]
  @Binding var isPresented: Bool
  @Binding var selectedIndex: Int

  func body(content: Content) -> some View {
    content
      .fullScreenCover(isPresented: $isPresented) {
        ImageViewer(
          images: images,
          selectedIndex: $selectedIndex,
          isPresented: $isPresented
        )
      }
  }
}

extension View {
  func imageViewer(
    images: [String],
    isPresented: Binding<Bool>,
    selectedIndex: Binding<Int>
  ) -> some View {
    modifier(ImageViewerModifier(
      images: images,
      isPresented: isPresented,
      selectedIndex: selectedIndex
    ))
  }
}

// MARK: - Preview

#Preview {
  @Previewable @State var isPresented = true
  @Previewable @State var selectedIndex = 0

  Color.gray
    .ignoresSafeArea()
    .imageViewer(
      images: [
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800",
        "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800",
        "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800",
      ],
      isPresented: $isPresented,
      selectedIndex: $selectedIndex
    )
}

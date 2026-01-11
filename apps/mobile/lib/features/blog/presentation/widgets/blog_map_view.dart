import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/blog_post.dart';

/// Blog map view showing locations using flutter_map with OpenStreetMap
class BlogMapView extends StatefulWidget {
  final List<BlogLocation> locations;
  final double height;
  final String? selectedLocationId;
  final void Function(String?)? onLocationSelected;

  const BlogMapView({
    super.key,
    required this.locations,
    this.height = 200,
    this.selectedLocationId,
    this.onLocationSelected,
  });

  @override
  State<BlogMapView> createState() => _BlogMapViewState();
}

class _BlogMapViewState extends State<BlogMapView> {
  final MapController _mapController = MapController();

  @override
  void didUpdateWidget(BlogMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Animate to selected location
    if (widget.selectedLocationId != null && 
        widget.selectedLocationId != oldWidget.selectedLocationId) {
      final selectedLocation = widget.locations.firstWhere(
        (loc) => loc.id == widget.selectedLocationId,
        orElse: () => widget.locations.first,
      );
      _mapController.move(
        LatLng(selectedLocation.latitude, selectedLocation.longitude),
        14.0,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.locations.isEmpty) {
      return Container(
        height: widget.height,
        decoration: BoxDecoration(
          color: AppColors.divider,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.map_outlined, size: 48, color: AppColors.textHint),
              const SizedBox(height: 8),
              Text(
                '暂无地点信息',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            ],
          ),
        ),
      );
    }

    // Calculate bounds for all locations
    final bounds = LatLngBounds.fromPoints(
      widget.locations.map((l) => LatLng(l.latitude, l.longitude)).toList(),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: widget.height,
        child: FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: bounds.center,
            initialZoom: _calculateZoom(bounds),
            minZoom: 3.0,
            maxZoom: 18.0,
            interactionOptions: const InteractionOptions(
              flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
            ),
          ),
          children: [
            // OpenStreetMap tiles
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.pathfinding.app',
            ),
            
            // Markers layer
            MarkerLayer(
              markers: widget.locations.asMap().entries.map((entry) {
                final index = entry.key;
                final location = entry.value;
                final isSelected = widget.selectedLocationId == location.id;
                
                return Marker(
                  point: LatLng(location.latitude, location.longitude),
                  width: isSelected ? 50 : 40,
                  height: isSelected ? 50 : 40,
                  child: GestureDetector(
                    onTap: () {
                      widget.onLocationSelected?.call(
                        isSelected ? null : location.id,
                      );
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.secondary : AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black26,
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  /// Calculate appropriate zoom level based on bounds
  double _calculateZoom(LatLngBounds bounds) {
    final latDiff = (bounds.north - bounds.south).abs();
    final lngDiff = (bounds.east - bounds.west).abs();
    final maxDiff = latDiff > lngDiff ? latDiff : lngDiff;
    
    if (maxDiff < 0.01) return 15.0;
    if (maxDiff < 0.05) return 13.0;
    if (maxDiff < 0.1) return 12.0;
    if (maxDiff < 0.5) return 10.0;
    if (maxDiff < 1.0) return 8.0;
    return 6.0;
  }
}

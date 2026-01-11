// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'itinerary_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$itineraryListHash() => r'0939e91c4a71111b7e3395d2fee3aa76e2347398';

/// Itinerary list provider
///
/// Copied from [itineraryList].
@ProviderFor(itineraryList)
final itineraryListProvider =
    AutoDisposeFutureProvider<List<ItineraryWithStats>>.internal(
      itineraryList,
      name: r'itineraryListProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$itineraryListHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ItineraryListRef =
    AutoDisposeFutureProviderRef<List<ItineraryWithStats>>;
String _$itineraryDetailHash() => r'07a4cd5b4d492b94a475c5bb734ec1765bab8f22';

/// Copied from Dart SDK
class _SystemHash {
  _SystemHash._();

  static int combine(int hash, int value) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + value);
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x0007ffff & hash) << 10));
    return hash ^ (hash >> 6);
  }

  static int finish(int hash) {
    // ignore: parameter_assignments
    hash = 0x1fffffff & (hash + ((0x03ffffff & hash) << 3));
    // ignore: parameter_assignments
    hash = hash ^ (hash >> 11);
    return 0x1fffffff & (hash + ((0x00003fff & hash) << 15));
  }
}

/// Itinerary detail provider
///
/// Copied from [itineraryDetail].
@ProviderFor(itineraryDetail)
const itineraryDetailProvider = ItineraryDetailFamily();

/// Itinerary detail provider
///
/// Copied from [itineraryDetail].
class ItineraryDetailFamily extends Family<AsyncValue<Itinerary>> {
  /// Itinerary detail provider
  ///
  /// Copied from [itineraryDetail].
  const ItineraryDetailFamily();

  /// Itinerary detail provider
  ///
  /// Copied from [itineraryDetail].
  ItineraryDetailProvider call(String id) {
    return ItineraryDetailProvider(id);
  }

  @override
  ItineraryDetailProvider getProviderOverride(
    covariant ItineraryDetailProvider provider,
  ) {
    return call(provider.id);
  }

  static const Iterable<ProviderOrFamily>? _dependencies = null;

  @override
  Iterable<ProviderOrFamily>? get dependencies => _dependencies;

  static const Iterable<ProviderOrFamily>? _allTransitiveDependencies = null;

  @override
  Iterable<ProviderOrFamily>? get allTransitiveDependencies =>
      _allTransitiveDependencies;

  @override
  String? get name => r'itineraryDetailProvider';
}

/// Itinerary detail provider
///
/// Copied from [itineraryDetail].
class ItineraryDetailProvider extends AutoDisposeFutureProvider<Itinerary> {
  /// Itinerary detail provider
  ///
  /// Copied from [itineraryDetail].
  ItineraryDetailProvider(String id)
    : this._internal(
        (ref) => itineraryDetail(ref as ItineraryDetailRef, id),
        from: itineraryDetailProvider,
        name: r'itineraryDetailProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$itineraryDetailHash,
        dependencies: ItineraryDetailFamily._dependencies,
        allTransitiveDependencies:
            ItineraryDetailFamily._allTransitiveDependencies,
        id: id,
      );

  ItineraryDetailProvider._internal(
    super._createNotifier, {
    required super.name,
    required super.dependencies,
    required super.allTransitiveDependencies,
    required super.debugGetCreateSourceHash,
    required super.from,
    required this.id,
  }) : super.internal();

  final String id;

  @override
  Override overrideWith(
    FutureOr<Itinerary> Function(ItineraryDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: ItineraryDetailProvider._internal(
        (ref) => create(ref as ItineraryDetailRef),
        from: from,
        name: null,
        dependencies: null,
        allTransitiveDependencies: null,
        debugGetCreateSourceHash: null,
        id: id,
      ),
    );
  }

  @override
  AutoDisposeFutureProviderElement<Itinerary> createElement() {
    return _ItineraryDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is ItineraryDetailProvider && other.id == id;
  }

  @override
  int get hashCode {
    var hash = _SystemHash.combine(0, runtimeType.hashCode);
    hash = _SystemHash.combine(hash, id.hashCode);

    return _SystemHash.finish(hash);
  }
}

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
mixin ItineraryDetailRef on AutoDisposeFutureProviderRef<Itinerary> {
  /// The parameter `id` of this provider.
  String get id;
}

class _ItineraryDetailProviderElement
    extends AutoDisposeFutureProviderElement<Itinerary>
    with ItineraryDetailRef {
  _ItineraryDetailProviderElement(super.provider);

  @override
  String get id => (origin as ItineraryDetailProvider).id;
}

String _$currentItineraryNotifierHash() =>
    r'717729e92f34d911c88ae216c20af0fb74869a38';

/// Current itinerary notifier for editing
///
/// Copied from [CurrentItineraryNotifier].
@ProviderFor(CurrentItineraryNotifier)
final currentItineraryNotifierProvider =
    AutoDisposeNotifierProvider<
      CurrentItineraryNotifier,
      AsyncValue<Itinerary?>
    >.internal(
      CurrentItineraryNotifier.new,
      name: r'currentItineraryNotifierProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$currentItineraryNotifierHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$CurrentItineraryNotifier =
    AutoDisposeNotifier<AsyncValue<Itinerary?>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package

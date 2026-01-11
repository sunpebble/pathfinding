// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'blog_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$blogListHash() => r'73f2cd2b58c616b0ce666330ac161f169718e0a7';

/// Blog list provider
///
/// Copied from [blogList].
@ProviderFor(blogList)
final blogListProvider =
    AutoDisposeFutureProvider<List<BlogPostWithStats>>.internal(
      blogList,
      name: r'blogListProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$blogListHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef BlogListRef = AutoDisposeFutureProviderRef<List<BlogPostWithStats>>;
String _$blogDetailHash() => r'451f2802ada831aad7229d177b206bdd1441258e';

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

/// Blog detail provider
///
/// Copied from [blogDetail].
@ProviderFor(blogDetail)
const blogDetailProvider = BlogDetailFamily();

/// Blog detail provider
///
/// Copied from [blogDetail].
class BlogDetailFamily extends Family<AsyncValue<BlogPostWithStats>> {
  /// Blog detail provider
  ///
  /// Copied from [blogDetail].
  const BlogDetailFamily();

  /// Blog detail provider
  ///
  /// Copied from [blogDetail].
  BlogDetailProvider call(String id) {
    return BlogDetailProvider(id);
  }

  @override
  BlogDetailProvider getProviderOverride(
    covariant BlogDetailProvider provider,
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
  String? get name => r'blogDetailProvider';
}

/// Blog detail provider
///
/// Copied from [blogDetail].
class BlogDetailProvider extends AutoDisposeFutureProvider<BlogPostWithStats> {
  /// Blog detail provider
  ///
  /// Copied from [blogDetail].
  BlogDetailProvider(String id)
    : this._internal(
        (ref) => blogDetail(ref as BlogDetailRef, id),
        from: blogDetailProvider,
        name: r'blogDetailProvider',
        debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
            ? null
            : _$blogDetailHash,
        dependencies: BlogDetailFamily._dependencies,
        allTransitiveDependencies: BlogDetailFamily._allTransitiveDependencies,
        id: id,
      );

  BlogDetailProvider._internal(
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
    FutureOr<BlogPostWithStats> Function(BlogDetailRef provider) create,
  ) {
    return ProviderOverride(
      origin: this,
      override: BlogDetailProvider._internal(
        (ref) => create(ref as BlogDetailRef),
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
  AutoDisposeFutureProviderElement<BlogPostWithStats> createElement() {
    return _BlogDetailProviderElement(this);
  }

  @override
  bool operator ==(Object other) {
    return other is BlogDetailProvider && other.id == id;
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
mixin BlogDetailRef on AutoDisposeFutureProviderRef<BlogPostWithStats> {
  /// The parameter `id` of this provider.
  String get id;
}

class _BlogDetailProviderElement
    extends AutoDisposeFutureProviderElement<BlogPostWithStats>
    with BlogDetailRef {
  _BlogDetailProviderElement(super.provider);

  @override
  String get id => (origin as BlogDetailProvider).id;
}

String _$currentBlogNotifierHash() =>
    r'343beec2da578f03c59ff1ab260bc48f859f2352';

/// Blog state notifier for managing current blog post
///
/// Copied from [CurrentBlogNotifier].
@ProviderFor(CurrentBlogNotifier)
final currentBlogNotifierProvider =
    AutoDisposeNotifierProvider<
      CurrentBlogNotifier,
      AsyncValue<BlogPostWithStats?>
    >.internal(
      CurrentBlogNotifier.new,
      name: r'currentBlogNotifierProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$currentBlogNotifierHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$CurrentBlogNotifier =
    AutoDisposeNotifier<AsyncValue<BlogPostWithStats?>>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package

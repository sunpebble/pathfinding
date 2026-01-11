import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/auth/presentation/pages/login_page.dart';
import '../features/home/presentation/pages/home_page.dart';
import '../features/blog/presentation/pages/blog_list_page.dart';
import '../features/blog/presentation/pages/blog_detail_page.dart';
import '../features/itinerary/presentation/pages/itinerary_list_page.dart';
import '../features/itinerary/presentation/pages/itinerary_detail_page.dart';
import '../features/itinerary/presentation/pages/create_itinerary_page.dart';
import '../features/itinerary/presentation/pages/imported_itinerary_page.dart';
import '../features/profile/presentation/pages/profile_page.dart';
import '../shared/widgets/main_scaffold.dart';

/// Route paths
class RoutePaths {
  static const String splash = '/splash';
  static const String login = '/login';
  static const String home = '/';
  static const String blog = '/blog';
  static const String blogDetail = '/blog/:id';
  static const String itinerary = '/itinerary';
  static const String itineraryDetail = '/itinerary/:id';
  static const String createItinerary = '/itinerary/create';
  static const String importedItinerary = '/itinerary/imported';
  static const String profile = '/profile';
}

/// App router configuration
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: RoutePaths.home,
    debugLogDiagnostics: true,
    routes: [
      // Login route
      GoRoute(
        path: RoutePaths.login,
        name: 'login',
        builder: (context, state) => const LoginPage(),
      ),
      
      // Main shell with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainScaffold(navigationShell: navigationShell);
        },
        branches: [
          // Home tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.home,
                name: 'home',
                builder: (context, state) => const HomePage(),
              ),
            ],
          ),
          
          // Blog tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.blog,
                name: 'blog',
                builder: (context, state) => const BlogListPage(),
                routes: [
                  GoRoute(
                    path: ':id',
                    name: 'blogDetail',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return BlogDetailPage(blogPostId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          
          // Itinerary tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.itinerary,
                name: 'itinerary',
                builder: (context, state) => const ItineraryListPage(),
                routes: [
                  GoRoute(
                    path: 'create',
                    name: 'createItinerary',
                    builder: (context, state) => const CreateItineraryPage(),
                  ),
                  GoRoute(
                    path: 'imported',
                    name: 'importedItinerary',
                    builder: (context, state) {
                      final blogPostId = state.uri.queryParameters['blogPostId'];
                      return ImportedItineraryPage(blogPostId: blogPostId);
                    },
                  ),
                  GoRoute(
                    path: ':id',
                    name: 'itineraryDetail',
                    builder: (context, state) {
                      final id = state.pathParameters['id']!;
                      return ItineraryDetailPage(itineraryId: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          
          // Profile tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: RoutePaths.profile,
                name: 'profile',
                builder: (context, state) => const ProfilePage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

import aggregate from '@convex-dev/aggregate/convex.config.js';
import { defineApp } from 'convex/server';

const app = defineApp();

// Aggregate for total guide count
app.use(aggregate, { name: 'aggregateGuides' });

// Aggregate for guide count by platform
app.use(aggregate, { name: 'aggregateGuidesByPlatform' });

export default app;

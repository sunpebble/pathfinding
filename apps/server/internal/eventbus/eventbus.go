package eventbus

import (
	"context"
	"log/slog"
	"sync"
)

// Event represents a message dispatched through the event bus.
type Event struct {
	Topic string
	Data  any
}

// Handler is a callback invoked when an event is published to a subscribed topic.
type Handler func(ctx context.Context, event Event) error

// subscription ties a handler to its dedicated event channel.
type subscription struct {
	topic   string
	handler Handler
	ch      chan Event
	done    chan struct{}
}

// EventBus is an in-memory, async publish/subscribe event dispatcher.
// Each subscription gets its own buffered channel and goroutine so that
// slow consumers never block publishers or other subscribers.
type EventBus struct {
	mu   sync.RWMutex
	subs map[string][]*subscription
	wg   sync.WaitGroup

	closed bool
}

// New creates a ready-to-use EventBus.
func New() *EventBus {
	return &EventBus{
		subs: make(map[string][]*subscription),
	}
}

const defaultChanSize = 256

// Subscribe registers a handler for the given topic.
// The handler will be invoked asynchronously in its own goroutine whenever
// an event with a matching topic is published.
func (eb *EventBus) Subscribe(topic string, handler Handler) {
	eb.mu.Lock()
	defer eb.mu.Unlock()

	if eb.closed {
		slog.Warn("eventbus: subscribe after close ignored", "topic", topic)
		return
	}

	sub := &subscription{
		topic:   topic,
		handler: handler,
		ch:      make(chan Event, defaultChanSize),
		done:    make(chan struct{}),
	}

	eb.subs[topic] = append(eb.subs[topic], sub)

	eb.wg.Add(1)
	go eb.consume(sub)

	slog.Info("eventbus: subscribed", "topic", topic)
}

// consume drains events from a subscription channel until the channel is closed.
func (eb *EventBus) consume(sub *subscription) {
	defer eb.wg.Done()
	defer close(sub.done)

	for event := range sub.ch {
		ctx := context.Background()
		if err := sub.handler(ctx, event); err != nil {
			slog.Error("eventbus: handler error",
				"topic", sub.topic,
				"error", err,
			)
		} else {
			slog.Debug("eventbus: event handled",
				"topic", sub.topic,
			)
		}
	}
}

// Publish dispatches an event to every subscriber of the event's topic.
// The call is non-blocking: events are enqueued into each subscriber's
// buffered channel.  If a subscriber's channel is full the event is dropped
// and a warning is logged.
func (eb *EventBus) Publish(ctx context.Context, event Event) error {
	eb.mu.RLock()
	defer eb.mu.RUnlock()

	if eb.closed {
		slog.Warn("eventbus: publish after close ignored", "topic", event.Topic)
		return nil
	}

	subscribers := eb.subs[event.Topic]
	if len(subscribers) == 0 {
		slog.Debug("eventbus: no subscribers", "topic", event.Topic)
		return nil
	}

	slog.Debug("eventbus: publishing",
		"topic", event.Topic,
		"subscribers", len(subscribers),
	)

	for _, sub := range subscribers {
		select {
		case sub.ch <- event:
		default:
			slog.Warn("eventbus: subscriber channel full, event dropped",
				"topic", event.Topic,
			)
		}
	}

	return nil
}

// Close gracefully shuts down the event bus.
// It closes every subscription channel and waits for all consumer goroutines
// to finish processing remaining events.
func (eb *EventBus) Close() {
	eb.mu.Lock()
	if eb.closed {
		eb.mu.Unlock()
		return
	}
	eb.closed = true

	for _, subs := range eb.subs {
		for _, sub := range subs {
			close(sub.ch)
		}
	}
	eb.mu.Unlock()

	eb.wg.Wait()
	slog.Info("eventbus: closed")
}

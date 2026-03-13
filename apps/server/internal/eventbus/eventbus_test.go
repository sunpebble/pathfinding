package eventbus

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// 测试：订阅一个主题后发布事件，验证订阅者能收到该事件
func TestSubscribeAndPublish(t *testing.T) {
	eb := New()
	defer eb.Close()

	received := make(chan Event, 1)

	eb.Subscribe("test.topic", func(ctx context.Context, event Event) error {
		received <- event
		return nil
	})

	want := Event{Topic: "test.topic", Data: "hello"}
	if err := eb.Publish(context.Background(), want); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	select {
	case got := <-received:
		if got.Topic != want.Topic {
			t.Errorf("topic mismatch: got %q, want %q", got.Topic, want.Topic)
		}
		if got.Data != want.Data {
			t.Errorf("data mismatch: got %v, want %v", got.Data, want.Data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for event")
	}
}

// 测试：同一主题上的多个订阅者都能收到事件
func TestMultipleSubscribers(t *testing.T) {
	eb := New()
	defer eb.Close()

	const subscriberCount = 5
	channels := make([]chan Event, subscriberCount)

	for i := 0; i < subscriberCount; i++ {
		ch := make(chan Event, 1)
		channels[i] = ch
		eb.Subscribe("multi.topic", func(ctx context.Context, event Event) error {
			ch <- event
			return nil
		})
	}

	want := Event{Topic: "multi.topic", Data: 42}
	if err := eb.Publish(context.Background(), want); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	for i, ch := range channels {
		select {
		case got := <-ch:
			if got.Topic != want.Topic || got.Data != want.Data {
				t.Errorf("subscriber %d: got %+v, want %+v", i, got, want)
			}
		case <-time.After(100 * time.Millisecond):
			t.Errorf("subscriber %d: timed out waiting for event", i)
		}
	}
}

// 测试：发布到主题 A 不会触发主题 B 的订阅者（主题隔离）
func TestTopicIsolation(t *testing.T) {
	eb := New()
	defer eb.Close()

	receivedA := make(chan Event, 1)
	receivedB := make(chan Event, 1)

	eb.Subscribe("topic.a", func(ctx context.Context, event Event) error {
		receivedA <- event
		return nil
	})

	eb.Subscribe("topic.b", func(ctx context.Context, event Event) error {
		receivedB <- event
		return nil
	})

	// 只向 topic.a 发布事件
	want := Event{Topic: "topic.a", Data: "only-for-a"}
	if err := eb.Publish(context.Background(), want); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	// topic.a 的订阅者应当收到事件
	select {
	case got := <-receivedA:
		if got.Data != want.Data {
			t.Errorf("topic.a subscriber: got %v, want %v", got.Data, want.Data)
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("topic.a subscriber: timed out waiting for event")
	}

	// topic.b 的订阅者不应收到任何事件
	select {
	case got := <-receivedB:
		t.Errorf("topic.b subscriber should not receive event, but got %+v", got)
	case <-time.After(100 * time.Millisecond):
		// 预期超时：topic.b 没有收到事件
	}
}

// 测试：关闭 EventBus 后，事件不再被投递给订阅者
func TestCloseStopsDelivery(t *testing.T) {
	eb := New()

	received := make(chan Event, 1)

	eb.Subscribe("close.topic", func(ctx context.Context, event Event) error {
		received <- event
		return nil
	})

	// 先发布一个事件，确认正常工作
	if err := eb.Publish(context.Background(), Event{Topic: "close.topic", Data: "before-close"}); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	select {
	case <-received:
		// 正常收到
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for event before close")
	}

	// 关闭 EventBus，模拟"取消订阅"
	eb.Close()

	// 关闭后发布的事件不应被投递
	_ = eb.Publish(context.Background(), Event{Topic: "close.topic", Data: "after-close"})

	select {
	case got := <-received:
		t.Errorf("should not receive event after close, but got %+v", got)
	case <-time.After(100 * time.Millisecond):
		// 预期超时：关闭后没有新事件
	}
}

// 测试：多个 goroutine 并发发布事件，所有事件都应被正确接收
func TestConcurrentPublish(t *testing.T) {
	eb := New()
	defer eb.Close()

	const goroutines = 5
	const eventsPerGoroutine = 20
	totalExpected := goroutines * eventsPerGoroutine

	var count atomic.Int64

	done := make(chan struct{})

	eb.Subscribe("concurrent.topic", func(ctx context.Context, event Event) error {
		if count.Add(1) == int64(totalExpected) {
			close(done)
		}
		return nil
	})

	var wg sync.WaitGroup
	for g := 0; g < goroutines; g++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for i := 0; i < eventsPerGoroutine; i++ {
				_ = eb.Publish(context.Background(), Event{
					Topic: "concurrent.topic",
					Data:  id*1000 + i,
				})
			}
		}(g)
	}

	wg.Wait()

	select {
	case <-done:
		got := count.Load()
		if got != int64(totalExpected) {
			t.Errorf("event count mismatch: got %d, want %d", got, totalExpected)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("timed out: received %d/%d events", count.Load(), totalExpected)
	}
}

// 测试：发布的数据在订阅者端保持不变（数据完整性）
func TestEventDataIntegrity(t *testing.T) {
	eb := New()
	defer eb.Close()

	type payload struct {
		ID     int
		Name   string
		Values []float64
		Meta   map[string]string
	}

	received := make(chan Event, 1)

	eb.Subscribe("integrity.topic", func(ctx context.Context, event Event) error {
		received <- event
		return nil
	})

	original := payload{
		ID:     999,
		Name:   "test-payload",
		Values: []float64{1.1, 2.2, 3.3},
		Meta:   map[string]string{"key": "value", "env": "test"},
	}

	if err := eb.Publish(context.Background(), Event{
		Topic: "integrity.topic",
		Data:  original,
	}); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	select {
	case got := <-received:
		p, ok := got.Data.(payload)
		if !ok {
			t.Fatalf("data type assertion failed: got %T", got.Data)
		}
		if p.ID != original.ID {
			t.Errorf("ID mismatch: got %d, want %d", p.ID, original.ID)
		}
		if p.Name != original.Name {
			t.Errorf("Name mismatch: got %q, want %q", p.Name, original.Name)
		}
		if len(p.Values) != len(original.Values) {
			t.Fatalf("Values length mismatch: got %d, want %d", len(p.Values), len(original.Values))
		}
		for i, v := range p.Values {
			if v != original.Values[i] {
				t.Errorf("Values[%d] mismatch: got %f, want %f", i, v, original.Values[i])
			}
		}
		if len(p.Meta) != len(original.Meta) {
			t.Fatalf("Meta length mismatch: got %d, want %d", len(p.Meta), len(original.Meta))
		}
		for k, want := range original.Meta {
			if gotV, exists := p.Meta[k]; !exists || gotV != want {
				t.Errorf("Meta[%q] mismatch: got %q, want %q", k, gotV, want)
			}
		}
	case <-time.After(100 * time.Millisecond):
		t.Fatal("timed out waiting for event")
	}
}

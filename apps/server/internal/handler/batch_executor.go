// batch_executor.go 把批量任务映射到 crawl.go 的爬取助手（设计 D12）。
// 结果走 internal/store 类型化保存（设计 D3），计数与失败原因全部透出。
package handler

import (
	"context"
	"fmt"
)

// ExecuteCrawlTask 执行单个批量爬取任务。
// 爬取层失败返回 error（任务记为 failed）；保存层失败透出在 TaskOutcome.SaveErrors。
func (h *Handler) ExecuteCrawlTask(ctx context.Context, task CrawlTask) (TaskOutcome, error) {
	switch task.TaskType {
	case taskTypeDestinationDetail:
		out, err := h.crawlDestination(ctx, task.DestinationID, task.DestinationName, defaultMaxRetries)
		if err != nil {
			return TaskOutcome{}, err
		}
		return singleSaveOutcome(out.Saved, out.SaveError), nil

	case taskTypeTravelNoteList:
		// destinationId 即马蜂窝 mddId → city-scoped 游记列表（设计 D10）
		list, err := h.crawlTravelNoteList(ctx, task.DestinationID, task.DestinationName, task.ScrollCount)
		if err != nil {
			return TaskOutcome{}, err
		}
		outcome := TaskOutcome{
			Found: len(list.URLs),
			Note:  fmt.Sprintf("cityScoped=%t source=%s", list.CityScoped, list.SourceURL),
		}
		if task.CrawlDetails {
			h.crawlGuideDetailsBatch(ctx, list.URLs, task, &outcome)
		}
		return outcome, nil

	case taskTypeGuideList:
		list, err := h.crawlGuideListPage(ctx, task.DestinationID, task.ScrollCount)
		if err != nil {
			return TaskOutcome{}, err
		}
		urls := make([]string, 0, len(list.Guides))
		for _, guide := range list.Guides {
			if guide.URL != "" {
				urls = append(urls, guide.URL)
			}
		}
		outcome := TaskOutcome{Found: len(list.Guides)}
		if task.CrawlDetails {
			h.crawlGuideDetailsBatch(ctx, urls, task, &outcome)
		}
		return outcome, nil

	case taskTypePOIList:
		out, err := h.crawlPOIList(ctx, task.DestinationID, task.DestinationName, task.Category, "", task.ScrollCount)
		if err != nil {
			return TaskOutcome{}, err
		}
		return TaskOutcome{
			Found:      len(out.POIs),
			Saved:      out.SavedCount,
			Failed:     len(out.SaveErrors),
			SaveErrors: out.SaveErrors,
		}, nil

	case taskTypeQAList:
		out, err := h.crawlQAList(ctx, task.DestinationID, task.DestinationName, "", task.ScrollCount)
		if err != nil {
			return TaskOutcome{}, err
		}
		return TaskOutcome{
			Found:      len(out.Questions),
			Saved:      out.SavedCount,
			Failed:     len(out.SaveErrors),
			SaveErrors: out.SaveErrors,
		}, nil

	case taskTypeRanking:
		out, err := h.crawlRanking(ctx, task.DestinationID, task.DestinationName, task.RankingType)
		if err != nil {
			return TaskOutcome{}, err
		}
		outcome := singleSaveOutcome(out.Saved, out.SaveError)
		outcome.Found = len(out.Items)
		return outcome, nil

	default:
		return TaskOutcome{}, fmt.Errorf("unknown task type %q", task.TaskType)
	}
}

// crawlGuideDetailsBatch 顺序爬取列表发现的游记详情（任务内同样限速），
// 计数与逐条失败原因写入 outcome。
func (h *Handler) crawlGuideDetailsBatch(ctx context.Context, urls []string, task CrawlTask, outcome *TaskOutcome) {
	limit := len(urls)
	if task.DetailsLimit > 0 && task.DetailsLimit < limit {
		limit = task.DetailsLimit
	}

	for i := 0; i < limit; i++ {
		if i > 0 && h.crawlInterval > 0 {
			h.sleep(h.crawlInterval)
		}
		detail, err := h.crawlGuideDetail(ctx, urls[i], defaultMaxRetries, task.DestinationID, task.DestinationName)
		if err != nil {
			outcome.Failed++
			outcome.SaveErrors = append(outcome.SaveErrors, err.Error())
			continue
		}
		outcome.DetailsCrawled++
		if detail.Saved {
			outcome.Saved++
			continue
		}
		outcome.Failed++
		outcome.SaveErrors = append(outcome.SaveErrors, fmt.Sprintf("%s: %s", urls[i], detail.SaveError))
	}
}

// singleSaveOutcome 把单条保存结果折算为任务计数。
func singleSaveOutcome(saved bool, saveError string) TaskOutcome {
	if saved {
		return TaskOutcome{Found: 1, Saved: 1}
	}
	return TaskOutcome{Found: 1, Failed: 1, SaveErrors: []string{saveError}}
}

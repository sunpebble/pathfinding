import { Model } from "@nozbe/watermelondb";
import { field, text, date, readonly } from "@nozbe/watermelondb/decorators";

/**
 * SyncQueue model for offline change tracking
 */
export default class SyncQueue extends Model {
  static table = "sync_queue";

  @text("table_name") tableName!: string;
  @text("record_id") recordId!: string;
  @text("action") action!: "create" | "update" | "delete";
  @text("payload") payloadJson!: string;
  @readonly @date("created_at") createdAt!: Date;
  @field("retries") retries!: number;
  @text("last_error") lastError!: string | null;

  /**
   * Get payload as parsed object
   */
  get payload(): Record<string, unknown> {
    try {
      return JSON.parse(this.payloadJson);
    } catch {
      return {};
    }
  }
}

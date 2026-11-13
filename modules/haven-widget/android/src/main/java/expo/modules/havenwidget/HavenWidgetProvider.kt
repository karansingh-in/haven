package expo.modules.havenwidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File
import java.util.concurrent.TimeUnit

// Renders the widget from the JSON the app wrote. Every string is formatted
// here rather than in JS so the widget keeps working when the bundle is
// unchanged; the payload stays raw numbers.
class HavenWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    for (id in appWidgetIds) render(context, appWidgetManager, id)
  }

  companion object {
    const val PAYLOAD_FILE = "haven-widget.json"
    private const val TAG = "HavenWidget"

    // Called by the module the moment the app publishes a new summary, so the
    // widget is correct before the launcher's 30-minute poll comes round.
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context) ?: return
      val ids = manager.getAppWidgetIds(ComponentName(context, HavenWidgetProvider::class.java))
      for (id in ids) render(context, manager, id)
    }

    fun render(context: Context, manager: AppWidgetManager, widgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.haven_widget)
      val payload = readPayload(context)

      if (payload == null) {
        views.setTextViewText(R.id.haven_widget_value, "—")
        views.setTextViewText(R.id.haven_widget_goal, "Open Haven to sync.")
        views.setTextViewText(R.id.haven_widget_dots, "")
        views.setTextViewText(R.id.haven_widget_stats, "")
        views.setTextViewText(R.id.haven_widget_updated, "")
        views.setProgressBar(R.id.haven_widget_bar, 100, 0, false)
      } else {
        val today = payload.optInt("todayMinutes", 0)
        val goal = payload.optInt("goalMinutes", 0)
        val pct = if (goal > 0) ((today.toFloat() / goal) * 100).toInt().coerceIn(0, 100) else 0

        views.setTextViewText(R.id.haven_widget_value, duration(today))
        views.setProgressBar(R.id.haven_widget_bar, 100, pct, false)
        views.setTextViewText(R.id.haven_widget_goal, goalLine(today, goal))
        views.setTextViewText(R.id.haven_widget_dots, payload.optString("dots", ""))
        views.setTextViewText(
          R.id.haven_widget_stats,
          statsLine(
            payload.optInt("streak", 0),
            payload.optInt("backlogMinutes", 0),
            payload.optInt("daysLeft", 0),
          ),
        )
        views.setTextViewText(
          R.id.haven_widget_updated,
          updatedLine(payload.optLong("updatedAt", 0L)),
        )
      }

      val pending = openApp(context)
      if (pending != null) {
        views.setOnClickPendingIntent(R.id.haven_widget_root, pending)
      }
      manager.updateAppWidget(widgetId, views)
    }

    private fun readPayload(context: Context): JSONObject? {
      return try {
        val file = File(context.filesDir, PAYLOAD_FILE)
        if (!file.exists()) null else JSONObject(file.readText())
      } catch (error: Exception) {
        Log.w(TAG, "could not read payload", error)
        null
      }
    }

    private fun openApp(context: Context): PendingIntent? {
      val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
      intent.flags = intent.flags or Intent.FLAG_ACTIVITY_NEW_TASK
      return PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    // 0 -> "0m", 45 -> "45m", 90 -> "1h 30m", 480 -> "8h".
    fun duration(minutes: Int): String {
      val total = minutes.coerceAtLeast(0)
      val hours = total / 60
      val rest = total % 60
      return when {
        hours == 0 -> "${rest}m"
        rest == 0 -> "${hours}h"
        else -> "${hours}h ${rest}m"
      }
    }

    fun goalLine(today: Int, goal: Int): String {
      if (goal <= 0) return "Set a goal in Haven"
      if (today >= goal) return "${duration(goal)} goal met"
      return "${duration(goal)} goal · ${duration(goal - today)} to go"
    }

    fun statsLine(streak: Int, backlog: Int, daysLeft: Int): String {
      val parts = mutableListOf<String>()
      if (streak > 0) parts.add("$streak-day streak")
      parts.add(if (backlog <= 0) "backlog clear" else "${duration(backlog)} backlog")
      if (daysLeft > 0) parts.add("$daysLeft days to NEET")
      return parts.joinToString("  ·  ")
    }

    fun updatedLine(updatedAt: Long): String {
      if (updatedAt <= 0L) return ""
      val minutes = TimeUnit.MILLISECONDS.toMinutes(System.currentTimeMillis() - updatedAt)
      return when {
        minutes < 1 -> "updated just now"
        minutes < 60 -> "updated ${minutes}m ago"
        minutes < 60 * 24 -> "updated ${minutes / 60}h ago"
        else -> "updated ${minutes / (60 * 24)}d ago"
      }
    }
  }
}

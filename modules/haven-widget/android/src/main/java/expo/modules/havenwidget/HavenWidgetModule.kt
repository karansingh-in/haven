package expo.modules.havenwidget

import android.content.Context
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

// The JS side hands over one JSON string. Writing it to the app's own
// filesDir means the widget needs no network, no permission and no Firestore
// client — the provider simply reads the file back.
class HavenWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HavenWidget")

    AsyncFunction("update") { json: String ->
      val context = appContext.reactContext
      if (context != null) {
        write(context, json)
        HavenWidgetProvider.refresh(context)
      }
    }
  }

  private fun write(context: Context, json: String) {
    try {
      File(context.filesDir, HavenWidgetProvider.PAYLOAD_FILE).writeText(json)
    } catch (error: Exception) {
      Log.w("HavenWidget", "could not write payload", error)
    }
  }
}

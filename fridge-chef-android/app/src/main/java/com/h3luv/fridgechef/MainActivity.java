package com.h3luv.fridgechef;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://fridge-chef-ai-tan.vercel.app/";
    private static final String TRUSTED_HOST = "fridge-chef-ai-tan.vercel.app";
    private static final int APP_BACKGROUND = Color.rgb(255, 249, 238);

    private WebView webView;
    private ProgressBar progressBar;
    private LinearLayout errorView;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureSystemBars();

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(APP_BACKGROUND);
        applyStableSystemBarPadding(root);

        webView = new WebView(this);
        webView.setBackgroundColor(APP_BACKGROUND);
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        errorView = buildErrorView();
        errorView.setVisibility(View.GONE);
        root.addView(errorView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(3)
        );
        progressParams.gravity = Gravity.TOP;
        root.addView(progressBar, progressParams);

        setContentView(root);
        configureWebView();

        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            showWebContent();
        } else {
            loadHome();
        }
    }

    private void configureSystemBars() {
        getWindow().setStatusBarColor(APP_BACKGROUND);
        getWindow().setNavigationBarColor(APP_BACKGROUND);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
            }
            getWindow().getDecorView().setSystemUiVisibility(flags);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            getWindow().setNavigationBarContrastEnforced(false);
        }
    }

    private void applyStableSystemBarPadding(FrameLayout root) {
        if (Build.VERSION.SDK_INT < 35) return;

        int topInset = getAndroidDimension("status_bar_height");
        int bottomInset = getAndroidDimension("navigation_bar_height");
        root.setPadding(0, topInset, 0, bottomInset);
    }

    private int getAndroidDimension(String name) {
        int resourceId = getResources().getIdentifier(name, "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }

    private LinearLayout buildErrorView() {
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);
        container.setPadding(dp(28), dp(28), dp(28), dp(28));
        container.setBackgroundColor(APP_BACKGROUND);

        TextView icon = new TextView(this);
        icon.setText("🍳");
        icon.setTextSize(42);
        icon.setGravity(Gravity.CENTER);
        container.addView(icon);

        TextView title = new TextView(this);
        title.setText(R.string.connection_error_title);
        title.setTextColor(Color.rgb(37, 91, 67));
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(14), 0, dp(8));
        container.addView(title);

        TextView message = new TextView(this);
        message.setText(R.string.connection_error_message);
        message.setTextColor(Color.rgb(104, 94, 82));
        message.setTextSize(15);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, 0, 0, dp(18));
        container.addView(message);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setAllCaps(false);
        retry.setOnClickListener(view -> loadHome());
        container.addView(retry, new LinearLayout.LayoutParams(dp(150), dp(50)));

        return container;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebView.setWebContentsDebuggingEnabled(false);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " FridgeChefAndroid/1.0.2");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            settings.setSafeBrowsingEnabled(true);
        }

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, false);

        webView.addJavascriptInterface(new ShareBridge(), "FridgeChefApp");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                showWebContent();
                progressBar.setVisibility(View.VISIBLE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progressBar.setVisibility(View.GONE);
                installNativeShareBridge(view);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternallyWhenNeeded(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternallyWhenNeeded(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showConnectionError();
            }

            @SuppressWarnings("deprecation")
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                showConnectionError();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 500) {
                    showConnectionError();
                }
            }
        });
    }

    private boolean openExternallyWhenNeeded(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        if ("https".equalsIgnoreCase(scheme) && TRUSTED_HOST.equalsIgnoreCase(host)) {
            return false;
        }

        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException error) {
            Toast.makeText(this, "이 링크를 열 수 있는 앱이 없습니다.", Toast.LENGTH_SHORT).show();
        }
        return true;
    }

    private void installNativeShareBridge(WebView view) {
        String script = "(function(){try{" +
                "if(!window.FridgeChefApp){return;}" +
                "var nativeShare=function(data){return new Promise(function(resolve,reject){" +
                "try{window.FridgeChefApp.share(JSON.stringify(data||{}));resolve();}" +
                "catch(error){reject(error);}});};" +
                "Object.defineProperty(navigator,'share',{configurable:true,value:nativeShare});" +
                "}catch(error){}})();";
        view.evaluateJavascript(script, null);
    }

    private void loadHome() {
        showWebContent();
        progressBar.setVisibility(View.VISIBLE);
        webView.loadUrl(HOME_URL);
    }

    private void showWebContent() {
        errorView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void showConnectionError() {
        progressBar.setVisibility(View.GONE);
        webView.setVisibility(View.INVISIBLE);
        errorView.setVisibility(View.VISIBLE);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        webView.onPause();
        webView.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        webView.resumeTimers();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.removeJavascriptInterface("FridgeChefApp");
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.clearHistory();
            webView.removeAllViews();
            webView.destroy();
        }
        super.onDestroy();
    }

    private final class ShareBridge {
        @JavascriptInterface
        public void share(String payload) {
            try {
                JSONObject data = new JSONObject(payload == null ? "{}" : payload);
                String title = data.optString("title", "냉털셰프 레시피");
                String text = data.optString("text", "").trim();
                String url = data.optString("url", HOME_URL).trim();

                StringBuilder body = new StringBuilder(text);
                if (!url.isEmpty() && !text.contains(url)) {
                    if (body.length() > 0) body.append("\n\n");
                    body.append(url);
                }

                runOnUiThread(() -> {
                    Intent sendIntent = new Intent(Intent.ACTION_SEND);
                    sendIntent.setType("text/plain");
                    sendIntent.putExtra(Intent.EXTRA_SUBJECT, title);
                    sendIntent.putExtra(Intent.EXTRA_TITLE, title);
                    sendIntent.putExtra(Intent.EXTRA_TEXT, body.toString());
                    startActivity(Intent.createChooser(sendIntent, "레시피 공유하기"));
                });
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(
                        MainActivity.this,
                        "공유 내용을 준비하지 못했습니다.",
                        Toast.LENGTH_SHORT
                ).show());
            }
        }
    }
}

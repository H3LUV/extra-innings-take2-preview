from pathlib import Path

path = Path('app/src/main/java/com/h3luv/fridgechef/MainActivity.java')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        'import android.view.View;\n',
        'import android.view.View;\nimport android.view.WindowInsets;\n'
    ),
    (
        '        applyStableSystemBarPadding(root);',
        '        applySystemBarInsets(root);'
    ),
    (
        '        setContentView(root);\n        configureWebView();',
        '        setContentView(root);\n        root.requestApplyInsets();\n        configureWebView();'
    ),
    (
        '''    private void applyStableSystemBarPadding(FrameLayout root) {
        if (Build.VERSION.SDK_INT < 35) return;

        int bottomInset = getAndroidDimension("navigation_bar_height");
        root.setPadding(0, 0, 0, bottomInset);
    }

    private int getAndroidDimension(String name) {
        int resourceId = getResources().getIdentifier(name, "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }
''',
        '''    @SuppressWarnings("deprecation")
    private void applySystemBarInsets(FrameLayout root) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) return;

        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int left = insets.getSystemWindowInsetLeft();
            int top = insets.getSystemWindowInsetTop();
            int right = insets.getSystemWindowInsetRight();
            int bottom = insets.getSystemWindowInsetBottom();

            view.setPadding(left, top, right, bottom);
            return insets.consumeSystemWindowInsets();
        });
    }
'''
    ),
    (
        'FridgeChefAndroid/1.0.3',
        'FridgeChefAndroid/1.0.4'
    )
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Expected source block not found: {old[:80]!r}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Applied runtime WindowInsets handling to MainActivity.java')

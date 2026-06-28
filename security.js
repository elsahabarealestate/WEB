/**
 * ═══════════════════════════════════════════════════════════
 * Advanced Security Script — El Sahaba Real Estate
 * Protects Source Code, Disables DevTools & Right Click
 * ═══════════════════════════════════════════════════════════
 */

(function () {
    // 1. منع الكليك يمين تماماً
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // 2. منع اختصارات لوحة التحكم وكشف السورس كود
    document.addEventListener('keydown', (e) => {
        // منع F12
        if (e.key === 'F12') {
            e.preventDefault();
        }
        // منع Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+U (View Source), Ctrl+S (Save Page)
        if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'i' || e.key === 'j') || e.key === 'U' || e.key === 'u' || e.key === 'S' || e.key === 's')) {
            e.preventDefault();
        }
        // منع الاختصارات على أجهزة الماك (Cmd + Option + I / J / U)
        if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'j' || e.key === 'u')) {
            e.preventDefault();
        }
        // منع اختصار الماك لعرض السورس كود (Cmd + U)
        if (e.metaKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S')) {
            e.preventDefault();
        }
    });

    // 3. حيلة الـ Debugger (تجميد المتصفح لو حاول يفتح الـ Inspect يدوي من المتصفح)
    function detectDevTools() {
        setInterval(function () {
            debugger;
        }, 100);
    }

    // تشغيل الحماية بدون تعطيل الـ Loader أو أكواد الموقع
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', detectDevTools);
    } else {
        detectDevTools();
    }
})();
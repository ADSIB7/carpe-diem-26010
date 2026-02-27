(function () {
  var runtime = window.__APP_CONFIG__ || window.__RUNTIME_CONFIG__ || {};
  var metaUrlEl = document.querySelector('meta[name="supabase-url"]');
  var metaKeyEl = document.querySelector('meta[name="supabase-anon-key"]');

  var resolvedUrl =
    window.SUPABASE_URL ||
    runtime.SUPABASE_URL ||
    runtime.supabaseUrl ||
    (metaUrlEl ? metaUrlEl.content : "");

  var resolvedAnonKey =
    window.SUPABASE_ANON_KEY ||
    runtime.SUPABASE_ANON_KEY ||
    runtime.supabaseAnonKey ||
    (metaKeyEl ? metaKeyEl.content : "");

  window.SUPABASE_URL = resolvedUrl;
  window.SUPABASE_ANON_KEY = resolvedAnonKey;
})();

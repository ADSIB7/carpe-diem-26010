try {
    console.log("Testing config/env...");
    require("./config/env");
    console.log("Testing lib/supabase...");
    require("./lib/supabase");
    console.log("Testing lib/demoInit...");
    require("./lib/demoInit");
    console.log("Testing lib/simulation...");
    require("./lib/simulation");
    console.log("Testing routes/authRoutes...");
    require("./routes/authRoutes");
    console.log("Testing routes/uiDataRoutes...");
    require("./routes/uiDataRoutes");
    console.log("Testing app...");
    require("./app");
    console.log("All imports successful!");
} catch (err) {
    console.error("Import failed:");
    console.error(err);
    process.exit(1);
}

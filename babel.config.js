module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }]
        ],
        plugins: [
            // Reanimated plugin must be listed LAST
            "react-native-worklets-core/plugin",
            "react-native-reanimated/plugin",
        ],
    };
};

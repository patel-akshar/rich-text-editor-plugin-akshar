cd richTextField/v1
npm run build
cd ../..
rm ComponentPlugin_Rich_Text_*.zip
sail-tools zip
zip --delete ComponentPlugin_Rich_Text_*.zip "richTextField/v1/node_modules/*"
zip --delete ComponentPlugin_Rich_Text_*.zip "*.sh"
zip --delete ComponentPlugin_Rich_Text_*.zip "**/.DS_Store"

unzip -l ComponentPlugin_Rich_Text_*.zip | more
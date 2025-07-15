#target photoshop

if (app.documents.length === 0) {
    alert("⚠️ 请先打开一个PSD文档！");
} else {
    var doc = app.activeDocument;
    var originalName = doc.name.replace(/\.[^.]+$/, "");
    
    // 设置默认保存路径为原文档目录
    var saveFile = File.saveDialog("💾 另存为瘦身版 PSD", "*.psd", originalName + "_瘦身版.psd");
    
    if (saveFile) {
        // 开始瘦身处理
        try {
            // 删除隐藏图层和空组
            processLayers(doc.layers);
            
            // 清理缓存（历史/剪贴板/撤销）
            app.purge(PurgeTarget.HISTORYCACHES);
            app.purge(PurgeTarget.CLIPBOARDCACHE);
            app.purge(PurgeTarget.UNDOCACHES);
            
            // 设置保存选项
            var psdOptions = new PhotoshopSaveOptions();
            psdOptions.maximizeCompatibility = false; // 禁用最大兼容性
            psdOptions.embedColorProfile = true;      // 保留色彩配置文件
            psdOptions.layers = true;                 // 保留图层
            
            // 保存文件
            doc.saveAs(saveFile, psdOptions, true);
            alert("✅ 瘦身成功！文件已保存至:\n" + saveFile.fsName);
        } catch(e) {
            alert("❌ 保存失败: " + e.message);
        }
    }
}

// 递归处理图层函数
function processLayers(layers) {
    for (var i = layers.length - 1; i >= 0; i--) {
        var layer = layers[i];
        
        // 处理图层组
        if (layer.typename === "LayerSet") {
            processLayers(layer.layers); // 递归处理子图层
            if (layer.layers.length === 0) {
                layer.remove(); // 删除空组
            }
        }
        // 处理普通图层
        else if (!layer.visible) {
            if (layer.allLocked) layer.allLocked = false; // 强制解锁
            layer.remove(); // 删除隐藏图层
        }
    }
}

// Photoshop脚本：批量导出所有图层为PNG (兼容旧版)
// 新增功能：跳过锁定图层（但保留锁定图层的视觉效果）
// ===============================================================

var originalFile = new File($.fileName);
var originalName = originalFile.name.replace(/\.[^\.]+$/, '');

// 主执行函数
function exportAllLayers() {
    try {
        // 检查文档是否打开
        if (!documents.length) {
            alert("没有打开的文档");
            return;
        }

        var doc = activeDocument;
        var rootLayers = doc.layers;
        
        // 创建输出文件夹
        var savePath = createOutputFolder(doc.path);
        if (!savePath) return;
        
        // 备份状态
        var origUnits = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;
        
        // 开始导出
        var exportCount = exportRecursive(rootLayers, savePath);
        
        // 完成提示
        alert("导出完成! 共导出 " + exportCount + " 个图层");
        
        // 恢复设置
        app.preferences.rulerUnits = origUnits;
        
    } catch (e) {
        alert("发生错误: 行号 #" + e.line + "\n\n" + e.message);
    }
}

// 递归导出图层
function exportRecursive(layers, savePath) {
    var count = 0;
    
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        
        // 处理图层组
        if (layer.typename === "LayerSet") {
            count += exportRecursive(layer.layers, savePath);
        } 
        // 处理普通图层
        else if (layer.typename === "ArtLayer") {
            // 只导出可见且未锁定的图层
            if (layer.visible && !isLayerLocked(layer)) {
                var success = exportSingleLayer(layer, savePath, layer.name);
                if (success) count++;
            }
        }
    }
    return count;
}

// 检查图层是否被锁定（任一方式）
function isLayerLocked(layer) {
    return layer.allLocked || 
           layer.transparencyLocked || 
           layer.positionLocked || 
           layer.pixelsLocked;
}

// 创建输出文件夹
function createOutputFolder(docPath) {
    var now = new Date();
    var timestamp = now.getFullYear() + 
                   ("0" + (now.getMonth() + 1)).slice(-2) +
                   ("0" + now.getDate()).slice(-2) + "_" +
                   ("0" + now.getHours()).slice(-2) +
                   ("0" + now.getMinutes()).slice(-2);
    
    var folderName = originalName + "_导出_" + timestamp;
    var outputFolder = Folder(docPath + "/" + folderName + "/");
    
    if (!outputFolder.exists) {
        outputFolder.create();
    }
    return outputFolder;
}

// 解锁背景层
function unlockBackgroundLayer(layer) {
    layer.isBackgroundLayer = false;
}

// 导出单个图层
function exportSingleLayer(layer, outputFolder, name) {
    try {
        // 备份原始可见状态（包括锁定状态）
        var doc = activeDocument;
        var origVis = {};
        saveVisibility(doc, origVis);
        
        // 隐藏所有图层并记录锁定状态
        hideAllUnlockedLayers(doc);
        
        // 设置当前图层可见（即使上层图层组隐藏也能显示）
        forceLayerVisible(layer);
        
        // 创建有效文件名
        var cleanName = name.replace(/[\\\/:*?"<>|]/g, '_').replace(/\s+/g, '');
        var timestamp = new Date().getTime();
        var fileName = cleanName + "_" + timestamp + ".png";
        var filePath = outputFolder.fsName + '/' + fileName;
        
        // 导出选项
        var exportOptions = new ExportOptionsSaveForWeb();
        exportOptions.format = SaveDocumentType.PNG;
        exportOptions.PNG8 = false;        // 使用PNG-24
        exportOptions.transparency = true;  // 保留透明度
        
        // 执行导出
        var file = new File(filePath);
        doc.exportDocument(
            file, 
            ExportType.SAVEFORWEB, 
            exportOptions
        );
        
        // 恢复可见状态
        restoreVisibility(origVis);
        
        return true;
    } catch (e) {
        alert("[" + layer.name + "] 导出失败: " + e.message);
        return false;
    }
}

// 确保图层在图层组中也能显示
function forceLayerVisible(layer) {
    var currentLayer = layer;
    while (currentLayer.parent) {
        if (currentLayer.parent.typename === "LayerSet") {
            currentLayer.parent.visible = true;
        }
        currentLayer = currentLayer.parent;
    }
    layer.visible = true;
}

// 保存所有可见状态
function saveVisibility(doc, visibilityObject) {
    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        visibilityObject[layer.id] = {
            visible: layer.visible,
            locked: isLayerLocked(layer)
        };
        
        // 递归处理图层组
        if (layer.typename === "LayerSet") {
            saveLayerSetVisibility(layer, visibilityObject);
        }
    }
}

// 递归保存图层组可见状态
function saveLayerSetVisibility(layerSet, visibilityObject) {
    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];
        visibilityObject[layer.id] = {
            visible: layer.visible,
            locked: isLayerLocked(layer)
        };
        
        if (layer.typename === "LayerSet") {
            saveLayerSetVisibility(layer, visibilityObject);
        }
    }
}

// 锁定图层不影响导出效果的关键方法：
function hideAllUnlockedLayers(doc) {
    for (var i = 0; i < doc.layers.length; i++) {
        var layer = doc.layers[i];
        
        // 只隐藏未锁定的图层
        if (!isLayerLocked(layer)) {
            layer.visible = false;
        }
        
        // 递归处理图层组
        if (layer.typename === "LayerSet") {
            hideUnlockedLayerSet(layer);
        }
    }
}

// 递归隐藏在图层组中未锁定的图层
function hideUnlockedLayerSet(layerSet) {
    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];
        
        // 只隐藏未锁定的图层
        if (!isLayerLocked(layer)) {
            layer.visible = false;
        }
        
        if (layer.typename === "LayerSet") {
            hideUnlockedLayerSet(layer);
        }
    }
}

// 恢复所有可见状态
function restoreVisibility(visibilityObject) {
    var doc = activeDocument;
    
    try {
        // 恢复主图层
        for (var i = 0; i < doc.layers.length; i++) {
            var layer = doc.layers[i];
            if (visibilityObject.hasOwnProperty(layer.id)) {
                // 只恢复可见状态的设置
                layer.visible = visibilityObject[layer.id].visible;
            }
            
            // 递归恢复图层组
            if (layer.typename === "LayerSet") {
                restoreLayerSetVisibility(layer, visibilityObject);
            }
        }
    } catch (e) {
        // 即使恢复失败也不中断程序
    }
}

// 递归恢复图层组可见状态
function restoreLayerSetVisibility(layerSet, visibilityObject) {
    for (var i = 0; i < layerSet.layers.length; i++) {
        var layer = layerSet.layers[i];
        if (visibilityObject.hasOwnProperty(layer.id)) {
            // 只恢复可见状态的设置
            layer.visible = visibilityObject[layer.id].visible;
        }
        
        if (layer.typename === "LayerSet") {
            restoreLayerSetVisibility(layer, visibilityObject);
        }
    }
}

// 执行导出
exportAllLayers();

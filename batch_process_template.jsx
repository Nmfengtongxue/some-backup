#target photoshop

// Photoshop脚本：批量导入图片到模板并导出
// 功能：将图片批量导入PSD模板，自动缩放匹配宽度，对齐左上角，置于底层，然后批量导出

try {
    // 选择PSD模板文件
    var templateFile = File.openDialog("请选择PSD模板文件", "*.psd", false);
    if (templateFile === null) {
        alert("操作已取消");
        exit();
    }
    
    // 选择包含图片的文件夹
    var inputFolder = Folder.selectDialog("请选择包含图片的文件夹");
    if (inputFolder === null) {
        alert("操作已取消");
        exit();
    }
    
    // 获取文件夹中的所有图片文件
    var fileList = inputFolder.getFiles(/\.(jpg|jpeg|png|gif|bmp|tif|tiff)$/i);
    if (fileList.length === 0) {
        alert("所选文件夹中没有找到图片文件");
        exit();
    }
    
    // 打开模板文件
    var templateDoc = app.open(templateFile);
    var canvasWidth = templateDoc.width.as('px');
    var canvasHeight = templateDoc.height.as('px');
    
    // 处理每张图片
    for (var i = 0; i < fileList.length; i++) {
        var imageFile = fileList[i];
        
        // 打开图片
        var imageDoc = app.open(imageFile);
        
        // 计算缩放比例以匹配模板宽度
        var scalePercent = (canvasWidth / imageDoc.width.as('px')) * 100;
        imageDoc.resizeImage(
            UnitValue(canvasWidth, 'px'), 
            UnitValue(imageDoc.height.as('px') * (scalePercent / 100), 'px'), 
            imageDoc.resolution, 
            ResampleMethod.BICUBIC
        );
        
        // 全选并复制图片
        imageDoc.selection.selectAll();
        imageDoc.selection.copy();
        imageDoc.close(SaveOptions.DONOTSAVECHANGES);
        
        // 粘贴到模板文档
        var pastedLayer = templateDoc.paste();
        
        // 将图层移动到最底层
        pastedLayer.move(templateDoc.layers[templateDoc.layers.length - 1], ElementPlacement.PLACEBEFORE);
        
        // 对齐到左上角
        pastedLayer.translate(-pastedLayer.bounds[0].as('px'), -pastedLayer.bounds[1].as('px'));
        
        // 准备输出文件名
        var fileName = imageFile.name.replace(/\.[^\.]+$/, '') + "_定西.jpg";
        var outputFile = new File(inputFolder + "/" + fileName);
        
        // 导出为JPG
        var jpgSaveOptions = new JPEGSaveOptions();
        jpgSaveOptions.quality = 12; // 最高质量
        templateDoc.saveAs(outputFile, jpgSaveOptions, true, Extension.LOWERCASE);
        
        // 撤销操作以恢复原始模板状态
        templateDoc.activeHistoryState = templateDoc.historyStates[0];
    }
    
    // 关闭模板文件
    templateDoc.close(SaveOptions.DONOTSAVECHANGES);
    
    alert("处理完成！共处理了 " + fileList.length + " 张图片");
} catch (e) {
    alert("发生错误:\n" + e.message + "\n在行: " + e.line);
}

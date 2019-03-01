/**
 * @file app.js
 * @author caixiaowen zhuyeqing
 */

exports = module.exports = {
    host: 'https://smartprogram.baidu.com',

    // 初始页面路径
    mainPage: '/docs/develop/tutorial/codedir/',

    // API分类列表
    categoryList: '[data-name="api"] > ul > li',

    // API分类名称
    categoryName: '.m-doc-h1-list > div',

    // 每个分类下的子分类列表
    apiList: '.m-doc-h1-children > li',

    // 每个分类下API的a标签
    apiHtml: 'ul a',

    // 每个API下的参数表格
    paramTable: 'tbody > tr',

    // API为h2标题
    apiTitle: 'h2',

    // 参数放在表格里
    apiParamTable: 'table',

    // 表格第一列为参数名
    paramColumn: 'td:nth-of-type(1)',

    // 表格第二列为参数类型
    typeColumn: 'td:nth-of-type(2)',

    // 表格第三列为是否必填
    neccessColumn: 'td:nth-of-type(3)',

    // 读取的url存放在a标签的href属性里
    urlProp: 'href',

    // 最终存储的文件名称
    fileName: 'index.json'
};

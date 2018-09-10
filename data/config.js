/**
 * @file app.js
 * @author caixiaowen
 */

export const DICT = {
    host: 'https://smartprogram.baidu.com',
    // 初始页面路径
    mainPage: '/docs/develop/framework/app-service_getcurrentpages/',
    // API总列下的分类
    categoryClass: '.m-doc-sidebar-nav-selected[data-name|="api"] > ul > li',
    // 每个分类下的API表格
    apiTable: '.article-entry tbody tr',
    // 每个API下的参数表格
    paramTable: 'tbody > tr',
    // 现在存放API都是a标签
    apiHtml: 'a',
    // API为h2标题
    apiTitle: 'h2',
    // 参数放在表格里
    apiParamTable: 'table',
    // 表格第一列为参数名
    paramColumn: 'td:nth-of-type(1)',
    // 表格第三列为是否必填
    neccessColumn: 'td:nth-of-type(3)',
    // 读取的url存放在a标签的href属性里
    urlProp: 'href',
    // 最终存储的文件名称
    fileName: 'app.json'
};

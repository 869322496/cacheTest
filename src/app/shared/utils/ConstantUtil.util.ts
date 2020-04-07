/**
 *前端常量工具枚举
 *可注入GXservice，双向绑定html
 * @author ludaxian
 * @date 2020-03-21
 */
export enum ConstantUtil {
  NYXFZL = '能源消费总量',
  ZHNYXFL = '综合能源消费量',
  WYZCZNH = '万元产值综合能耗',
  GYYD = '工业用电',
  TWO_LEVEL_REGION_CALL = '地州', //显示的一、二级区域的名称（省市，市区，地州）
  PIE_NODATA_DEFAULT = '[{"value":0,"name":"暂无数据"}]', //饼图无数据初始化（需prase json）
  ICON_DIAN = 'icon-dian', //能源卡片图标
  ICON_MEITAN = 'icon-meitan',
  ICON_RELI = 'icon-reli',
  ICON_YOU = 'icon-you',
  ICON_JIAOTAN = 'icon-jiaotan',
  ICON_QI = 'icon-qi',
  ICON_QITA = 'icon-qita',
  YEAR = 'year',
  MONTH = 'month',
  DAY = 'day',
  XINHAI_EMPTYSTR = '-',
  SORT_DESCEND = 'descend',
  SORT_ASCEND = 'ascend',
  ALL_INDUSTRY = 'ALL_INDUSTRY',
  GET_DICTIONARYITEM_URL = '/report/ReportCommon/getDictionaryItem',
  GET_SYSTEMPARAMTERBYCODE_URL = '/report/ReportCommon/getSystemParameterByCode',
}

import { Observable, of } from 'rxjs';
import { deepCopy } from '@delon/util';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import {
  subDays,
  startOfMonth,
  subMonths,
  subYears,
  startOfDay,
  startOfYear,
  endOfDay,
  endOfYear,
  endOfMonth,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
} from 'date-fns';
import { ConstantUtil } from './utils/ConstantUtil.util';
import { DictionaryItem } from './DictionaryItem.entity';
import { InvokeResult } from './entity/InvokeResult.entity';
/**
 * 封装共通服务
 * @author ludaxian
 * @date 2020-03-20
 * @export
 * @class GXService
 */
@Injectable({
  providedIn: 'root',
})
export class GXService {
  getSystemParameterByCodeUrl = ConstantUtil.GET_DICTIONARYITEM_URL;
  getDictionaryItemUrl = ConstantUtil.GET_DICTIONARYITEM_URL;
  public ConstantUtil = ConstantUtil; //绑定html用
  public isEmpty = GXService.isEmpty;
  public ConvertToNumber = GXService.ConvertToNumber;
  constructor(private http: HttpClient) {}

  /**
   * 按照某个字段已存在的某种顺序排序
   *
   * @author ludaxian
   * @date 2020-03-27
   * @param orderList 目标数组 [a,b,c]
   * @param sortList  排序数组 [...,{...,sortName:b},{...,sortName:a}];
   * @param sortName 排序字段
   */
  sortInOrderList(orderList: any[], sortList: any[], sortName: string): any[] {
    if (GXService.isEmpty(orderList) || GXService.isEmpty(sortList)) {
      return sortList;
    }
    if (sortList.some(item => !orderList.includes(item[sortName]))) {
      throw new Error('排序值不存在于目标数组中');
    }
    let sortListCopy = deepCopy(sortList);
    return sortListCopy.sort(
      (a, b) => orderList.findIndex(item => item === a[sortName]) - orderList.findIndex(item => item === b[sortName]),
    );
  }
  /**
   *转换成数字
   *信海平台特殊值
   * @author ludaxian
   * @date 2020-03-13
   * @static
   * @param value 值
   * @param decimalPlaces 保留小数位数
   * @returns number
   */
  static ConvertToNumber(value: any, decimalPlaces?: number): number {
    if (value == null || value === '' || value === ConstantUtil.XINHAI_EMPTYSTR) {
      return Number(decimalPlaces ? new Number(0).toFixed(decimalPlaces) : 0);
    } else {
      return Number(decimalPlaces ? Number(value).toFixed(decimalPlaces) : value);
    }
  }

  /**
   *判断数组和对象是否为null,undefiend,[],{}，'-'
   *
   * @author ludaxian
   * @date 2020-03-21
   * @param array/object
   * @returns boolean
   */
  static isEmpty(any: any): boolean {
    return (
      ConstantUtil.XINHAI_EMPTYSTR == any ||
      any == undefined ||
      (Array.isArray(any) && any.length == 0) ||
      (Object.prototype.isPrototypeOf(any) && Object.keys(any).length == 0)
    );
  }
  /**
   * 获取初期化时间段
   * 日：返回当前月1日起到昨日止
   * 月：返回1月起到上月止 当前月为1月返回去年1月起到去年12月止
   * 年：返回1月起到上月止，当前月为1月返回为去年1月起到去年12月止
   * @author ludaxian
   * @param dateType year/month/day
   * @date 2020-03-21
   * @returns [Date,Date]
   */
  static getGxInitDateRange(dateType: string): Date[] {
    let dateRange: Date[] = [];
    //const now = new Date();
    const now = new Date();
    switch (dateType) {
      case ConstantUtil.YEAR:
        if (now.getMonth() + 1 == 1) {
          //跨年
          dateRange = [startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))];
        } else {
          dateRange = [startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))];
        }
        break;
      case ConstantUtil.MONTH:
        if (now.getMonth() + 1 == 1) {
          //跨年
          dateRange = [startOfYear(subYears(now, 1)), endOfYear(subYears(now, 1))];
        } else {
          dateRange = [
            //startOfMonth(subMonths(now, 1)),
            startOfYear(subYears(now, 0)),
            endOfMonth(subMonths(now, 1)),
          ];
        }

        break;
      case ConstantUtil.DAY:
        break;
      default:
        break;
    }
    return dateRange;
  }

  /**
   *Ant Desgin 时间控件禁用回调
   *不能选择昨天之后的日期
   * @author ludaxian
   * @date 2020-03-24
   * @returns boolean
   */
  setDisabledDayRange = (current: Date) => {
    return differenceInDays(startOfDay(current), startOfDay(new Date())) > -1;
  };
  /**
   *Ant Desgin 时间控件禁用回调
   *不能选择上月之后的日期
   * @author ludaxian
   * @date 2020-03-24
   * @returns boolean
   */
  setDisabledMonthRange = (current: Date) => {
    return differenceInMonths(startOfMonth(current), startOfMonth(new Date())) > -1;
  };
  /**
   *Ant Desgin 时间控件禁用回调
   *不能选择去年之后的日期
   * @author ludaxian
   * @date 2020-03-24
   * @returns boolean
   */
  setDisabledYearRange = (current: Date) => {
    return differenceInYears(startOfYear(current), startOfYear(new Date())) > -1;
  };
  /**
   *查询业务字典 不存在请写null
   *
   * @author ludaxian
   * @date 2020-03-21
   * @param dicCode
   * @returns
   */
  getDictionaryItem(dicCode: string): Observable<DictionaryItem[]> {
    return this.http
      .get<DictionaryItem[]>(`${this.getDictionaryItemUrl}/${dicCode}`)
      .pipe(switchMap(result => of(result['data']['DictionaryItemList'])));
  }

  /**
   * 排序共通
   * @param sortName 排序字段名称
   * @param sortValue  排序顺序 descend ascend null
   * @param list 排序数组
   * @param sortType 排序类型待扩展
   */
  doSort(sortName: string, sortValue: string, list: any[], sortType?: string) {
    const copyList = deepCopy(list);
    if (sortName && sortValue) {
      let noDataList = [];
      let sortList = [];
      list.forEach(item => {
        if (GXService.isEmpty(item[sortName]) || item[sortName] === '-') {
          noDataList = [...noDataList, item];
        } else {
          sortList = [...sortList, item];
        }
      });
      return [
        ...sortList.sort((a, b) => {
          return sortValue === ConstantUtil.SORT_ASCEND
            ? Number(a[sortName!]) > Number(b[sortName!])
              ? 1
              : -1
            : Number(b[sortName!]) > Number(a[sortName!])
            ? 1
            : -1;
        }),
        ...noDataList,
      ];
    } else {
      return copyList;
    }
  }
  /**
   *
   *
   * @author ludaxian
   * @date 2020-03-17
   * @param code
   */
  getSystemParameter(code: string): Observable<InvokeResult> {
    return this.http.get<InvokeResult>(`${this.getSystemParameterByCodeUrl}/${code}`);
  }
  /**
   *读取本地json文件
   *
   * @author ludaxian
   * @date 2020-03-12
   */
  readJson(): Observable<any> {
    return this.getSystemParameter('geojsonName').pipe(
      switchMap(res => {
        var url = `../../assets/json/${res['data']['value']}.json`; /*json文件url，本地的就写本地的位置，如果是服务器的就写服务器的路径*/
        var request = new XMLHttpRequest();
        request.open('get', url); /*设置请求方法与路径*/
        request.send(null); /*不发送数据到服务器*/
        return new Observable(observer => {
          request.onload = function() {
            if (request.status == 200) {
              var json = JSON.parse(request.responseText);
              observer.next(json);
            }
          };
        });
      }),
    );
  }
}

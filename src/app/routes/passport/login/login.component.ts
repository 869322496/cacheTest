import { DictionaryItem } from './../../../shared/DictionaryItem.entity';
import { SettingsService, _HttpClient } from '@delon/theme';
import { Component, OnDestroy, Inject, Optional, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzMessageService, NzModalService } from 'ng-zorro-antd';
import { SocialService, SocialOpenType, ITokenService, DA_SERVICE_TOKEN } from '@delon/auth';
import { ReuseTabService } from '@delon/abc';
import { StartupService } from 'app/core/startup/startup.service';
import { environment } from 'environments/environment';
import { deepCopy } from '@delon/util';
import { last, filter } from 'rxjs/operators';
import { GXService } from 'app/shared/GX.service';

@Component({
  selector: 'passport-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  providers: [SocialService],
})
export class UserLoginComponent implements OnDestroy, OnInit {
  constructor(
    fb: FormBuilder,
    modalSrv: NzModalService,
    private router: Router,
    private settingsService: SettingsService,
    private socialService: SocialService,
    @Optional()
    @Inject(ReuseTabService)
    private reuseTabService: ReuseTabService,
    @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService,
    private startupSrv: StartupService,
    public http: _HttpClient,
    public msg: NzMessageService,
  ) {
    this.form = fb.group({
      userName: [null, [Validators.required, Validators.minLength(4)]],
      password: [null, Validators.required],
      mobile: [null, [Validators.required, Validators.pattern(/^1\d{10}$/)]],
      captcha: [null, [Validators.required]],
      remember: [true],
    });
    modalSrv.closeAll();
  }
  table4Data = [];

  // #region fields

  get userName() {
    return this.form.controls.userName;
  }
  get password() {
    return this.form.controls.password;
  }
  get mobile() {
    return this.form.controls.mobile;
  }
  get captcha() {
    return this.form.controls.captcha;
  }
  form: FormGroup;
  error = '';
  type = 0;

  // #region get captcha

  count = 0;
  interval$: any;

  // #endregion

  switch(ret: any) {
    this.type = ret.index;
  }

  getCaptcha() {
    if (this.mobile.invalid) {
      this.mobile.markAsDirty({ onlySelf: true });
      this.mobile.updateValueAndValidity({ onlySelf: true });
      return;
    }
    this.count = 59;
    this.interval$ = setInterval(() => {
      this.count -= 1;
      if (this.count <= 0) {
        clearInterval(this.interval$);
      }
    }, 1000);
  }

  // #endregion

  submit() {
    this.error = '';
    if (this.type === 0) {
      this.userName.markAsDirty();
      this.userName.updateValueAndValidity();
      this.password.markAsDirty();
      this.password.updateValueAndValidity();
      if (this.userName.invalid || this.password.invalid) {
        return;
      }
    } else {
      this.mobile.markAsDirty();
      this.mobile.updateValueAndValidity();
      this.captcha.markAsDirty();
      this.captcha.updateValueAndValidity();
      if (this.mobile.invalid || this.captcha.invalid) {
        return;
      }
    }

    // 默认配置中对所有HTTP请求都会强制 [校验](https://ng-alain.com/auth/getting-started) 用户 Token
    // 然一般来说登录请求不需要校验，因此可以在请求URL加上：`/login?_allow_anonymous=true` 表示不触发用户 Token 校验
    this.http
      .post('/login/account?_allow_anonymous=true', {
        type: this.type,
        userName: this.userName.value,
        password: this.password.value,
      })
      .subscribe((res: any) => {
        if (res.msg !== 'ok') {
          this.error = res.msg;
          return;
        }
        // 清空路由复用信息
        this.reuseTabService.clear();
        // 设置用户Token信息
        this.tokenService.set(res.user);
        // 重新获取 StartupService 内容，我们始终认为应用信息一般都会受当前用户授权范围而影响
        this.startupSrv.load().then(() => {
          let url = this.tokenService.referrer!.url || '/';
          if (url.includes('/passport')) {
            url = '/';
          }
          this.router.navigateByUrl(url);
        });
      });
  }

  // #region social

  open(type: string, openType: SocialOpenType = 'href') {
    let url = ``;
    let callback = ``;
    // tslint:disable-next-line: prefer-conditional-expression
    if (environment.production) {
      callback = 'https://ng-alain.github.io/ng-alain/#/callback/' + type;
    } else {
      callback = 'http://localhost:4200/#/callback/' + type;
    }
    switch (type) {
      case 'auth0':
        url = `//cipchk.auth0.com/login?client=8gcNydIDzGBYxzqV0Vm1CX_RXH-wsWo5&redirect_uri=${decodeURIComponent(
          callback,
        )}`;
        break;
      case 'github':
        url = `//github.com/login/oauth/authorize?client_id=9d6baae4b04a23fcafa2&response_type=code&redirect_uri=${decodeURIComponent(
          callback,
        )}`;
        break;
      case 'weibo':
        url = `https://api.weibo.com/oauth2/authorize?client_id=1239507802&response_type=code&redirect_uri=${decodeURIComponent(
          callback,
        )}`;
        break;
    }
    if (openType === 'window') {
      this.socialService
        .login(url, '/', {
          type: 'window',
        })
        .subscribe(res => {
          if (res) {
            this.settingsService.setUser(res);
            this.router.navigateByUrl('/');
          }
        });
    } else {
      this.socialService.login(url, '/', {
        type: 'href',
      });
    }
  }

  // #endregion

  ngOnDestroy(): void {
    if (this.interval$) {
      clearInterval(this.interval$);
    }
  }
  ngOnInit(): void {
    /*     console.log(this.editTreeTabel(this.testData)); */
    this.tdData = this.testData2;
    //this.tdData = ;
  }
  tdData = [];
  /**
   * 按照字段排序 并将带有父子关联字段的一维数组 转换成 合并单元格数据结构的数组
   * @author ludaxian
   * @date 2020-04-01
   * @param list [...,{id,parentId,...}] 带有父子关联字段的一维数组
   * @param sortName 排序字段
   * @description 1.根节点的id和parentId相等  2.所有数据必须具有完整的父子关联属性（parentId,id）
   * @returns [..[{},{},..]]
   */
  editTreeTabel(list: any[]): any[] {
    let copyTreeNodes = deepCopy(list);
    //默认根节点id和parentId相同为根节点 后期可能补充其他判断根节点的情况
    const isRootNode = node => node['parentId'] === node['id'];
    //处理多根节点情况的数据（多支树）
    if (copyTreeNodes.filter(item => isRootNode(item)).length > 1) {
      const rootId = 'luRootId';
      let rootNode = { id: rootId, parentId: rootId, children: [] };
      copyTreeNodes.map(item => {
        if (isRootNode(item)) {
          item['parentId'] = rootId;
          rootNode['children'] = [...rootNode['children'], item];
        }
      });
      copyTreeNodes = [rootNode, ...copyTreeNodes];
    }

    //递归生成children树结构
    const editChildren = (childNodes = []) => {
      childNodes.forEach(item => {
        if (GXService.isEmpty(item['children'])) item['children'] = []; //强制设置children属性
        let child = copyTreeNodes.filter(node => node['parentId'] == item['id'] && !isRootNode(node));
        if (!GXService.isEmpty(child)) {
          item['children'] = child;
          editChildren(child);
        }
      });
      return childNodes;
    };
    //递归将树结构的数组转换成合并单元格数据结构的数组
    const treeToTableArr = (node, tableArr = [], trArr = []) => {
      if (GXService.isEmpty(node['children'])) {
        tableArr.push(trArr);
      } else {
        node['children'].forEach((childNode, index) => {
          if (index != 0 && !GXService.isEmpty(trArr)) {
            trArr[0]['rowSpan'] = 0;
          }
          const tdArr = [...deepCopy(trArr), childNode];
          if (tdArr.length === 1) {
            tdArr[0]['rowSpan'] = 1;
          } else if (tdArr.length > 1) {
            tdArr[tdArr.length - 2]['rowSpan'] = index === 0 ? getLeafNum(node) : 0;
            tdArr[tdArr.length - 1]['rowSpan'] = 1;
          }
          treeToTableArr(childNode, tableArr, tdArr);
        });
      }
      return tableArr;
    };
    //计算叶子节点的数量
    const getLeafNum = node => {
      if (GXService.isEmpty(node['children'])) {
        node['rowSpan'] = 1;
        return 1;
      } else {
        let leafNum = 0;
        node['children'].forEach(childNode => {
          leafNum += getLeafNum(childNode);
        });
        node['rowSpan'] = leafNum;
        return leafNum;
      }
    };

    editChildren(copyTreeNodes);
    return treeToTableArr(
      copyTreeNodes.find(item => isRootNode(item)),
      [],
      [],
    );
  }
  sumList = [
    [
      { id: '1', parent: '1', rowSpan: 4 },
      { parent: '1', id: '1-1', rowSpan: 1 },
      { parent: '1-1', id: '1-1-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-2', rowSpan: 1 },
      { parent: '1-2', id: '1-2-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-3', rowSpan: 2 },
      { parent: '1-3', id: '1-3-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-3', rowSpan: 0 },
      { parent: '1-3', id: '1-3-2', rowSpan: 1 },
    ],
  ];
  testData2 = [
    [
      { id: '1', parent: '1', rowSpan: 4 },
      { parent: '1', id: '1-1', rowSpan: 1 },
      { parent: '1-1', id: '1-1-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-2', rowSpan: 1 },
      { parent: '1-2', id: '1-2-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-3', rowSpan: 2 },
      { parent: '1-3', id: '1-3-1', rowSpan: 1 },
    ],
    [
      { id: '1', parent: '1', rowSpan: 0 },
      { parent: '1', id: '1-3', rowSpan: 0 },
      { parent: '1-3', id: '1-3-2', rowSpan: 1 },
    ],
  ];

  testData1: DictionaryItem[] = [
    {
      id: 'rootluziuxn',
      name: '计量器具管理规则',
      code: 'RuleRoot',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: null,
      sequence: 1,
      category: null,
      data: '根',
      standardCode: null,
      parentId: 'rootluziuxn',
      treeLevel: 1,
      address: '计量器具管理规则/',
    },
    {
      id: '364e7bab-ada8-422b-a0cd-0deba4b35945',
      name: '计量器具管理要求0301',
      code: 'Rule0301',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 1,
      category: '',
      data: '是否有完整的能源计量器具一览表',
      standardCode: '',
      parentId: '01098d97-19ee-4202-a816-9db572f47ce4',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0103/计量器具管理要求0301/',
    },
    {
      id: '39e90d69-855a-41b6-ad06-ffde343c976e',
      name: '计量器具管理要求0101',
      code: 'Rule0101',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 1,
      category: '',
      data: '是否建立能源计量制度，并形成文件',
      standardCode: '',
      parentId: '9a830226-3772-428c-8490-b0b3de738461',
      treeLevel: 3,
      address: '计量器具管理规则/规则1/计量器具管理要求01/',
    },
    {
      id: '548350fb-d66d-41c1-90c4-eb5673c1cfb9',
      name: '计量器具管理要求0401',
      code: 'Rule0401',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 1,
      category: '',
      data: '是否建立能源统计报表制度',
      standardCode: '',
      parentId: '7790cc0f-ab75-4b83-a93b-207c3be4ac02',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0104/计量器具管理要求0401/',
    },
    {
      id: '9a830226-3772-428c-8490-b0b3de738461',
      name: '计量器具管理规则01',
      code: 'Rule01',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 1,
      category: '',
      data: '能源计量制度',
      standardCode: '',
      parentId: 'rootluziuxn',
      treeLevel: 2,
      address: '计量器具管理规则/规则1/',
    },
    {
      id: 'b9159bb6-1097-4012-a6ae-afadbe35a416',
      name: '计量器具管理要求0201',
      code: 'Rule0201',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 1,
      category: '',
      data: '是否有人负责能源器具的管理',
      standardCode: '',
      parentId: 'c7d62b64-6c81-4c7f-a862-77b7360ef874',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0102/计量器具管理要求0201/',
    },
    {
      id: '02cb4319-212f-4db5-94fd-65bd00065b67',
      name: '计量器具管理要求0202',
      code: 'Rule0202',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 2,
      category: '',
      data: '是否有专人负责主要次级用能单位和主要用能设备的管理',
      standardCode: '',
      parentId: 'c7d62b64-6c81-4c7f-a862-77b7360ef874',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0102/计量器具管理要求0202/',
    },
    {
      id: '183dafe1-a579-4f58-b4f3-f8a126c98c08',
      name: '计量器具管理要求0302',
      code: 'Rule0302',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 2,
      category: '',
      data: '是否建立符合规定的能源计量器具档案情况',
      standardCode: '',
      parentId: '01098d97-19ee-4202-a816-9db572f47ce4',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0103/计量器具管理要求0302/',
    },
    {
      id: '3f3e2dae-bc1f-4cd9-83e1-e29bed263234',
      name: '计量器具管理要求0402',
      code: 'Rule0402',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 2,
      category: '',
      data: '是否有用于能源计量数据记录的标准表格样式',
      standardCode: '',
      parentId: '7790cc0f-ab75-4b83-a93b-207c3be4ac02',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0104/计量器具管理要求0402/',
    },
    {
      id: 'c7d62b64-6c81-4c7f-a862-77b7360ef874',
      name: '计量器具管理规则02',
      code: 'Rule02',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 2,
      category: '',
      data: '能源计量人员',
      standardCode: '',
      parentId: 'rootluziuxn',
      treeLevel: 2,
      address: '计量器具管理规则/计量器具管理规则0102/',
    },
    {
      id: '01098d97-19ee-4202-a816-9db572f47ce4',
      name: '计量器具管理规则03',
      code: 'Rule03',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 3,
      category: '',
      data: '能源计量制度',
      standardCode: '',
      parentId: 'rootluziuxn',
      treeLevel: 2,
      address: '计量器具管理规则/计量器具管理规则0103/',
    },
    {
      id: '4efe1fe0-c773-478b-bca8-43d2e1044d49',
      name: '计量器具管理要求0403',
      code: 'Rule0403',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 3,
      category: '',
      data: '是否实现了能源计量数据的网络化管理',
      standardCode: '',
      parentId: '7790cc0f-ab75-4b83-a93b-207c3be4ac02',
      treeLevel: 3,
      address: '计量器具管理规则/计量器具管理规则0104/计量器具管理要求0403/',
    },
    {
      id: '7790cc0f-ab75-4b83-a93b-207c3be4ac02',
      name: '计量器具管理规则04',
      code: 'Rule04',
      dictionaryId: 'f2a8538f-8fa8-4ebb-aa00-5fec6081c641',
      description: '',
      sequence: 4,
      category: '',
      data: '能源计量数据',
      standardCode: '',
      parentId: 'rootluziuxn',
      treeLevel: 2,
      address: '计量器具管理规则/计量器具管理规则0104/',
    },
  ];
  testData: DictionaryItem[] = [
    {
      id: '37ba9764-ae66-47f9-8fa7-940309ae69c8',
      name: '节能管理工作执行情况01',
      code: 'Ass02E1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 1,
      category: '',
      data: '1.实行能源审计或监测，并落实改进措施，2分；',
      standardCode: '',
      parentId: '62ddd396-019e-4cb8-840c-3f6ab03aa745',
      treeLevel: 3,
      address: '节能措施/节能管理工作执行情况/节能管理工作执行情况01/',
      children: [],
    },
    {
      id: '569c60c7-64a9-4ad6-a673-ac12d2f4a216',
      name: '节能量',
      code: 'Ass01A',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '40',
      sequence: 1,
      category: '',
      data: '40',
      standardCode: '',
      parentId: 'd25ad68d-e061-401b-9ae3-b8e926866839',
      treeLevel: 2,
      address: '节能目标/节能量/',
      children: [],
    },
    {
      id: '6763716a-559e-41a2-9994-9796efcd8b82',
      name: '节能量01',
      code: 'Ass01A1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '40',
      sequence: 1,
      category: '',
      data:
        '完成年度计划目标得40分，完成目标的90%得35分、80%得30分、70%得25分、60%得20分、50%得15分、50%以下不得分。每超额完成10%加2分，最多加6分。本指标为否决性指标，只要未达到目标值即为未完成等级。',
      standardCode: '',
      parentId: '569c60c7-64a9-4ad6-a673-ac12d2f4a216',
      treeLevel: 3,
      address: '节能目标/节能量/节能量01/',
      children: [],
    },
    {
      id: '76f323d6-0539-4571-b20a-a7d64c505ca5',
      name: '节能工作组织和领导情况01',
      code: 'Ass02A1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '3',
      sequence: 1,
      category: '',
      data: '1.建立由企业主要负责人为组长的节能工作领导小组并定期研究部署企业节能工作，3分；',
      standardCode: '',
      parentId: 'b197481b-5038-49a0-8544-118222b910dc',
      treeLevel: 3,
      address: '节能措施/节能工作组织和领导情况/节能工作组织和领导情况01/',
      children: [],
    },
    {
      id: '8b82c233-321f-46ff-9e0f-26a3297c0b6e',
      name: '--01',
      code: 'Ass03A1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '4',
      sequence: 1,
      category: '',
      data: '1.按标准建立能源管理体系，4分。',
      standardCode: '',
      parentId: 'c7ae56ca-3629-4496-b73d-b75a9624e589',
      treeLevel: 3,
      address: '加分项目/--/--01/',
      children: [],
    },
    {
      id: 'b197481b-5038-49a0-8544-118222b910dc',
      name: '节能工作组织和领导情况',
      code: 'Ass02A',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '5',
      sequence: 1,
      category: '',
      data: '5',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 2,
      address: '节能措施/节能工作组织和领导情况/',
      children: [],
    },
    {
      id: 'b4b3eab4-957a-4257-8771-7a2f8e022f58',
      name: '节能技术进步和节能技改实施情况01',
      code: 'Ass02C1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '10',
      sequence: 1,
      category: '',
      data: '1.主要产品单耗或综合能耗水平在千家企业同行业中，位居前20%的得10分，位居前50%的得5分，位居后50%的不得分；',
      standardCode: '',
      parentId: '8bf55d6a-e790-471a-b35b-2f1d00abedb8',
      treeLevel: 3,
      address: '节能措施/节能技术进步和节能技改实施情况/节能技术进步和节能技改实施情况01/',
      children: [],
    },
    {
      id: 'c7ae56ca-3629-4496-b73d-b75a9624e589',
      name: '--',
      code: 'Ass03A',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '6',
      sequence: 1,
      category: '',
      data: '6',
      standardCode: '',
      parentId: '8d735a5c-4580-4c6c-8eaa-6c4bb9378917',
      treeLevel: 2,
      address: '加分项目/--/',
      children: [],
    },
    {
      id: 'd25ad68d-e061-401b-9ae3-b8e926866839',
      name: '节能目标',
      code: 'Ass01',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '',
      sequence: 1,
      category: '',
      data: '',
      standardCode: '',
      parentId: 'd25ad68d-e061-401b-9ae3-b8e926866839',
      treeLevel: 1,
      address: '节能目标/',
      children: [],
    },
    {
      id: 'e0d1dcd4-cadf-4b9f-81f7-1805c33af0db',
      name: '节能目标分解和落实情况01',
      code: 'Ass02B1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '3',
      sequence: 1,
      category: '',
      data: '1.按年度将节能目标分解到车间、班组或个人，3分；',
      standardCode: '',
      parentId: '27330674-3c2e-4176-8418-13cbd57e4bf0',
      treeLevel: 3,
      address: '节能措施/节能目标分解和落实情况/节能目标分解和落实情况01/',
      children: [],
    },
    {
      id: 'ef17d6aa-ad67-44fd-812c-7dd7e9d616dd',
      name: '节能法律法规执行情况01',
      code: 'Ass02D1',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 1,
      category: '',
      data: '1.贯彻执行节约能源法及配套法律法规及地方性法规与政府规章，2分；',
      standardCode: '',
      parentId: '82cf4884-4668-4428-a73a-b41b89a5b9da',
      treeLevel: 3,
      address: '节能措施/节能法律法规执行情况/节能法律法规执行情况01/',
      children: [],
    },
    {
      id: '27330674-3c2e-4176-8418-13cbd57e4bf0',
      name: '节能目标分解和落实情况',
      code: 'Ass02B',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '10',
      sequence: 2,
      category: '',
      data: '10',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 2,
      address: '节能措施/节能目标分解和落实情况/',
      children: [],
    },
    {
      id: '30a4602c-9127-4f86-9aa2-951a471cf9f8',
      name: '--02',
      code: 'Ass03A2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 2,
      category: '',
      data: '2.开展能效对标并取得实效，2分。',
      standardCode: '',
      parentId: 'c7ae56ca-3629-4496-b73d-b75a9624e589',
      treeLevel: 3,
      address: '加分项目/--/--02/',
      children: [],
    },
    {
      id: '3601ecf1-3952-4163-97b0-239245a15ff7',
      name: '节能法律法规执行情况02',
      code: 'Ass02D2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '4',
      sequence: 2,
      category: '',
      data: '2.执行高耗能产品能耗限额标准，4分；',
      standardCode: '',
      parentId: '82cf4884-4668-4428-a73a-b41b89a5b9da',
      treeLevel: 3,
      address: '节能措施/节能法律法规执行情况/节能法律法规执行情况02/',
      children: [],
    },
    {
      id: '63c1bb8b-5a72-4d47-a5a6-fe9041e8b2dd',
      name: '节能技术进步和节能技改实施情况02',
      code: 'Ass02C2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '4',
      sequence: 2,
      category: '',
      data: '2.安排节能研发专项资金并逐年增加，4分；',
      standardCode: '',
      parentId: '8bf55d6a-e790-471a-b35b-2f1d00abedb8',
      treeLevel: 3,
      address: '节能措施/节能技术进步和节能技改实施情况/节能技术进步和节能技改实施情况02/',
      children: [],
    },
    {
      id: '7d15c082-4b52-4894-b296-bc04fd4a3283',
      name: '节能管理工作执行情况02',
      code: 'Ass02E2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '3',
      sequence: 2,
      category: '',
      data: '2.设立能源统计岗位，建立能源统计台账，按时保质报送能源统计报表，3分；',
      standardCode: '',
      parentId: '62ddd396-019e-4cb8-840c-3f6ab03aa745',
      treeLevel: 3,
      address: '节能措施/节能管理工作执行情况/节能管理工作执行情况02/',
      children: [],
    },
    {
      id: 'cc1f1e62-2b28-432b-8bf6-6a876dcd2442',
      name: '节能目标分解和落实情况02',
      code: 'Ass02B2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '3',
      sequence: 2,
      category: '',
      data: '2.对节能目标落实情况进行考评，3分；',
      standardCode: '',
      parentId: '27330674-3c2e-4176-8418-13cbd57e4bf0',
      treeLevel: 3,
      address: '节能措施/节能目标分解和落实情况/节能目标分解和落实情况02/',
      children: [],
    },
    {
      id: 'e496006f-5413-44a0-895d-034906c74d34',
      name: '节能措施',
      code: 'Ass02',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '',
      sequence: 2,
      category: '',
      data: '',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 1,
      address: '节能措施/',
      children: [],
    },
    {
      id: 'e4fea65c-2f6b-437f-9cb0-07c66c060a3e',
      name: '节能工作组织和领导情况02',
      code: 'Ass02A2',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 2,
      category: '',
      data: '2.设立或指定节能管理专门机构并提供工作保障，2分。',
      standardCode: '',
      parentId: 'b197481b-5038-49a0-8544-118222b910dc',
      treeLevel: 3,
      address: '节能措施/节能工作组织和领导情况/节能工作组织和领导情况02/',
      children: [],
    },
    {
      id: '4f3985a4-2029-49ac-a8af-c733ce06ae94',
      name: '节能目标分解和落实情况03',
      code: 'Ass02B3',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '4',
      sequence: 3,
      category: '',
      data: '3.实施节能奖惩制度，4分。',
      standardCode: '',
      parentId: '27330674-3c2e-4176-8418-13cbd57e4bf0',
      treeLevel: 3,
      address: '节能措施/节能目标分解和落实情况/节能目标分解和落实情况03/',
      children: [],
    },
    {
      id: '5104ff0c-11fe-46ad-9da2-2d4540f16bee',
      name: '节能法律法规执行情况03',
      code: 'Ass02D3',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 3,
      category: '',
      data: '3.实施主要耗能设备能耗定额管理制度，2分；',
      standardCode: '',
      parentId: '82cf4884-4668-4428-a73a-b41b89a5b9da',
      treeLevel: 3,
      address: '节能措施/节能法律法规执行情况/节能法律法规执行情况03/',
      children: [],
    },
    {
      id: '738d0b0d-8fe7-49ee-9633-710ec8f0ec0b',
      name: '节能技术进步和节能技改实施情况03',
      code: 'Ass02C3',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '4',
      sequence: 3,
      category: '',
      data: '3.实施并完成年度节能技改计划，4分；',
      standardCode: '',
      parentId: '8bf55d6a-e790-471a-b35b-2f1d00abedb8',
      treeLevel: 3,
      address: '节能措施/节能技术进步和节能技改实施情况/节能技术进步和节能技改实施情况03/',
      children: [],
    },
    {
      id: '8bf55d6a-e790-471a-b35b-2f1d00abedb8',
      name: '节能技术进步和节能技改实施情况',
      code: 'Ass02C',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '25',
      sequence: 3,
      category: '',
      data: '25',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 2,
      address: '节能措施/节能技术进步和节能技改实施情况/',
      children: [],
    },
    {
      id: '8d735a5c-4580-4c6c-8eaa-6c4bb9378917',
      name: '加分项目',
      code: 'Ass03',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '',
      sequence: 3,
      category: '',
      data: '',
      standardCode: '',
      parentId: '8d735a5c-4580-4c6c-8eaa-6c4bb9378917',
      treeLevel: 1,
      address: '加分项目/',
      children: [],
    },
    {
      id: '98810f6f-f420-43ba-88f3-ec4f4e2e92d6',
      name: '节能管理工作执行情况03',
      code: 'Ass02E3',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '3',
      sequence: 3,
      category: '',
      data: '3.依法依规配备能源计量器具，并定期进行检定、校准，3分；',
      standardCode: '',
      parentId: '62ddd396-019e-4cb8-840c-3f6ab03aa745',
      treeLevel: 3,
      address: '节能措施/节能管理工作执行情况/节能管理工作执行情况03/',
      children: [],
    },
    {
      id: '1f58f1f2-e609-4c71-8fa2-8d855b10f566',
      name: '节能管理工作执行情况04',
      code: 'Ass02E4',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 4,
      category: '',
      data: '4.节能宣传和节能技术培训工作，2分。',
      standardCode: '',
      parentId: '62ddd396-019e-4cb8-840c-3f6ab03aa745',
      treeLevel: 3,
      address: '节能措施/节能管理工作执行情况/节能管理工作执行情况04/',
      children: [],
    },
    {
      id: '6120f69f-ad77-49f1-a6f7-40601cd753fc',
      name: '节能技术进步和节能技改实施情况04',
      code: 'Ass02C4',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '7',
      sequence: 4,
      category: '',
      data: '4.按规定淘汰落后耗能工艺、设备和产品，7分。',
      standardCode: '',
      parentId: '8bf55d6a-e790-471a-b35b-2f1d00abedb8',
      treeLevel: 3,
      address: '节能措施/节能技术进步和节能技改实施情况/节能技术进步和节能技改实施情况04/',
      children: [],
    },
    {
      id: '661499ae-f0aa-40fc-9a9e-6285370b0ea8',
      name: '节能法律法规执行情况04',
      code: 'Ass02D4',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '2',
      sequence: 4,
      category: '',
      data: '4.新、改、扩建项目按节能设计规范和用能标准建设，2分。',
      standardCode: '',
      parentId: '82cf4884-4668-4428-a73a-b41b89a5b9da',
      treeLevel: 3,
      address: '节能措施/节能法律法规执行情况/节能法律法规执行情况04/',
      children: [],
    },
    {
      id: '82cf4884-4668-4428-a73a-b41b89a5b9da',
      name: '节能法律法规执行情况',
      code: 'Ass02D',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '10',
      sequence: 4,
      category: '',
      data: '10',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 2,
      address: '节能措施/节能法律法规执行情况/',
      children: [],
    },
    {
      id: '62ddd396-019e-4cb8-840c-3f6ab03aa745',
      name: '节能管理工作执行情况',
      code: 'Ass02E',
      dictionaryId: '0d2b0a5c-f8ec-4d24-add8-704cdc66fe25',
      description: '10',
      sequence: 5,
      category: '',
      data: '10',
      standardCode: '',
      parentId: 'e496006f-5413-44a0-895d-034906c74d34',
      treeLevel: 2,
      address: '节能措施/节能管理工作执行情况/',
      children: [],
    },
  ];
}

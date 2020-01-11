---
title: Source
order: 0
---

## 概述

source 地理数据处理模块，主要包含数据解析（parser)，和数据处理(transform);

- data
- option
  - cluster **boolean** 是否聚合
  - clusterOption 聚合配置项
  - parser 数据解析配置
  - transforms 数据处理配置

### parser

不同数据类型处理成统一数据格式。矢量数据包括 GeoJON, CSV，Json 等不同数据格式，栅格数据，包括 Raster，Image 数据。将来还会支持瓦片格式数据。

空间数据分矢量数据和栅格数据两大类

- 矢量数据 支持 csv，geojson，json 三种数据类型

- 栅格数据 支持 image，Raster

### transform

数据转换，数据统计，网格布局，数据聚合等数据操作。

## API

### cluster ``boolean` 可选 可以只设置

### clusterOption 可选

- radius 聚合半径 **number** default 40
- minZoom: 最小聚合缩放等级 **number** default 0
- maxZoom: 最大聚合缩放等级 **number** default 16

### parser

**配置项**

- type: `csv|json|geojson|image|raster`
- 其他可选配置项，具体和数据格式相关

#### geojson

[geojson](https://www.yuque.com/antv/l7/dm2zll) 数据为默认数据格式，可以 不设置 parser 参数

```javascript
layer.source(data);
```

### Source 更新

如果数据发生改变，可以需要更新数据
可以通过调用 layer 的 setData 方法实现数据的更新

具体见 [Layer](../layer/layer/#setdata)

```javascript
layer.setData(data);
```

#### JSON

[JSON 数据格式解析](./json)

#### csv

[CSV 数据格式解析](./csv)

栅格数据类型

#### image

[Image 数据格式解析](./image)

### transforms

tranforms 处理的是的标准化之后的数据
标准化之后的数据结构包括 coordinates 地理坐标字段，以及其他属性字段。

处理完之后返回的也是标准数据

```javascript
 [{
   coordinates: [[]] // 地理坐标字段
   _id:'',// 标准化之后新增字段
   name:''
   value:''
  // ....
 }]


```

目前支持两种热力图使用的数据处理方法 grid，hexagon transform 配置项

- type 数据处理类型
- tansform cfg  数据处理配置项

#### grid

生成方格网布局，根据数据字段统计，主要在网格热力图中使用

- type: 'grid',
- size: 网格半径
- field: 数据统计字段
- method:聚合方法   count,max,min,sum,mean5 个统计维度

```javascript
layer.source(data, {
  transforms: [
    {
      type: 'grid',
      size: 15000,
      field: 'v',
      method: 'sum',
    },
  ],
});
```

#### hexagon

生成六边形网格布局，根据数据字段统计

- type: 'hexagon',
- size: 网格半径
- field: 数据统计字段
- method:聚合方法   count,max,min,sum,mean 5 个统计维度
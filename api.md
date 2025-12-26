# OpenAPI definition

**简介**:OpenAPI definition

**HOST**:http://localhost:9017

**联系人**:

**Version**:v0

**接口路径**:/v3/api-docs

[TOC]

# 外部系统数据接口

## 批量保存教职工组织

**接口地址**:`/v1/base/teacher/org/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "teacherOrganizations": [
    {
      "id": "",
      "name": "",
      "pid": ""
    }
  ]
}
```

**请求参数**:

| 参数名称                         | 参数说明                       | 请求类型 | 是否必须 | 数据类型                 | schema                   |
| -------------------------------- | ------------------------------ | -------- | -------- | ------------------------ | ------------------------ |
| organizationBatchSaveReq         | 批量保存教职工组织架构请求     | body     | true     | OrganizationBatchSaveReq | OrganizationBatchSaveReq |
| &emsp;&emsp;teacherOrganizations | 教职工组织架构列表             |          | true     | array                    | TeacherOrganization      |
| &emsp;&emsp;&emsp;&emsp;id       | 唯一标识 ID                    |          | true     | string                   |                          |
| &emsp;&emsp;&emsp;&emsp;name     | 组织名称                       |          | true     | string                   |                          |
| &emsp;&emsp;&emsp;&emsp;pid      | 父级组织 ID,未设置则是顶层部门 |          | false    | string                   |                          |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存教师

**接口地址**:`/v1/base/teacher/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "teachers": [
    {
      "id": "",
      "name": "",
      "phone": "",
      "code": "",
      "email": "",
      "role": "",
      "orgClientIds": [],
      "customFields": {}
    }
  ]
}
```

**请求参数**:

| 参数名称                             | 参数说明                              | 请求类型 | 是否必须 | 数据类型            | schema              |
| ------------------------------------ | ------------------------------------- | -------- | -------- | ------------------- | ------------------- |
| teacherBatchSaveReq                  | 批量保存教职工组织架构请求            | body     | true     | TeacherBatchSaveReq | TeacherBatchSaveReq |
| &emsp;&emsp;teachers                 | 教职工组织架构列表                    |          | true     | array               | Teacher             |
| &emsp;&emsp;&emsp;&emsp;id           | 唯一标识 ID                           |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;name         | 姓名                                  |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;phone        | 手机号                                |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;code         | 工号                                  |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;email        | 邮箱                                  |          | false    | string              |                     |
| &emsp;&emsp;&emsp;&emsp;role         | 角色,成员或者管理员，未设置默认为成员 |          | false    | string              |                     |
| &emsp;&emsp;&emsp;&emsp;orgClientIds | 所属教师组织 ID 列表                  |          | true     | array               | string              |
| &emsp;&emsp;&emsp;&emsp;customFields | 自定义字段,key:value map 结构         |          | false    | object              |                     |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存学生组织

**接口地址**:`/v1/base/stu/org/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "stuClasses": [
    {
      "id": "",
      "name": "",
      "pid": "",
      "year": 0,
      "code": ""
    }
  ]
}
```

**请求参数**:

| 参数名称                     | 参数说明                       | 请求类型 | 是否必须 | 数据类型          | schema            |
| ---------------------------- | ------------------------------ | -------- | -------- | ----------------- | ----------------- |
| classBatchSaveReq            | 批量保存学生组织架构请求       | body     | true     | ClassBatchSaveReq | ClassBatchSaveReq |
| &emsp;&emsp;stuClasses       | 学生组织架构列表               |          | true     | array             | StuClass          |
| &emsp;&emsp;&emsp;&emsp;id   | 唯一标识 ID                    |          | true     | string            |                   |
| &emsp;&emsp;&emsp;&emsp;name | 组织名称                       |          | true     | string            |                   |
| &emsp;&emsp;&emsp;&emsp;pid  | 父级组织 ID,未设置则是顶层部门 |          | false    | string            |                   |
| &emsp;&emsp;&emsp;&emsp;year | 入学年级                       |          | true     | integer(int32)    |                   |
| &emsp;&emsp;&emsp;&emsp;code |                                |          | false    | string            |                   |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存学生

**接口地址**:`/v1/base/stu/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "stus": [
    {
      "id": "",
      "name": "",
      "phone": "",
      "code": "",
      "year": 0,
      "classId": "",
      "educateLevel": "{\"培养层次educateLevel\":\"1\"}"
    }
  ]
}
```

**请求参数**:

| 参数名称                             | 参数说明                      | 请求类型 | 是否必须 | 数据类型            | schema              |
| ------------------------------------ | ----------------------------- | -------- | -------- | ------------------- | ------------------- |
| studentBatchSaveReq                  | 批量保存学生请求              | body     | true     | StudentBatchSaveReq | StudentBatchSaveReq |
| &emsp;&emsp;stus                     | 学生列表                      |          | true     | array               | Student             |
| &emsp;&emsp;&emsp;&emsp;id           | 唯一标识 ID                   |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;name         | 姓名                          |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;phone        | 手机号                        |          | false    | string              |                     |
| &emsp;&emsp;&emsp;&emsp;code         | 学号                          |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;year         | 入学年级                      |          | false    | integer(int32)      |                     |
| &emsp;&emsp;&emsp;&emsp;classId      | 所属班级 ID                   |          | true     | string              |                     |
| &emsp;&emsp;&emsp;&emsp;educateLevel | 自定义字段,key:value map 结构 |          | false    | string              |                     |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存学期

**接口地址**:`/v1/base/semester/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "semesters": [
    {
      "id": "",
      "year": 0,
      "name": "",
      "startTime": "2025/02/21",
      "endTime": "2025/07/21"
    }
  ]
}
```

**请求参数**:

| 参数名称                          | 参数说明     | 请求类型 | 是否必须 | 数据类型             | schema               |
| --------------------------------- | ------------ | -------- | -------- | -------------------- | -------------------- |
| semesterBatchSaveReq              | 批量保存学期 | body     | true     | SemesterBatchSaveReq | SemesterBatchSaveReq |
| &emsp;&emsp;semesters             | 学期列表     |          | true     | array                | Semester             |
| &emsp;&emsp;&emsp;&emsp;id        | 唯一标识 ID  |          | true     | string               |                      |
| &emsp;&emsp;&emsp;&emsp;year      | 学年         |          | true     | integer(int32)       |                      |
| &emsp;&emsp;&emsp;&emsp;name      | 学期名称     |          | true     | string               |                      |
| &emsp;&emsp;&emsp;&emsp;startTime | 学期开始时间 |          | true     | string               |                      |
| &emsp;&emsp;&emsp;&emsp;endTime   | 学期结束时间 |          | true     | string               |                      |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 按学期批量推送课程达成度

**接口地址**:`/v1/base/objective/push`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求参数**:

暂无

**响应状态**:

| 状态码 | 说明      | schema              |
| ------ | --------- | ------------------- |
| 200    | OK        | BaseResponseBoolean |
| 404    | Not Found | BaseResponseObject  |

**响应状态码-200**:

**响应参数**:

| 参数名称 | 参数说明 | 类型    | schema |
| -------- | -------- | ------- | ------ |
| code     |          | string  |        |
| message  |          | string  |        |
| data     |          | boolean |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": true
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存课程

**接口地址**:`/v1/base/course/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "courses": [
    {
      "id": "",
      "name": "",
      "code": "",
      "deptId": "",
      "assessMethod": "考核",
      "requireType": "必修",
      "examMethod": "",
      "examStyle": "",
      "courseNature": ""
    }
  ]
}
```

**请求参数**:

| 参数名称                             | 参数说明             | 请求类型 | 是否必须 | 数据类型           | schema             |
| ------------------------------------ | -------------------- | -------- | -------- | ------------------ | ------------------ |
| courseBatchSaveReq                   | 批量保存课程         | body     | true     | CourseBatchSaveReq | CourseBatchSaveReq |
| &emsp;&emsp;courses                  | 课程列表             |          | true     | array              | Course             |
| &emsp;&emsp;&emsp;&emsp;id           | 唯一标识 ID          |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;name         | 课程名称             |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;code         | 课程编号             |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;deptId       | 开课单位(教职工组织) |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;assessMethod | 考核方式(考试或考查) |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;requireType  | 课程属性(选修或必修) |          | true     | string             |                    |
| &emsp;&emsp;&emsp;&emsp;examMethod   | 考试方式代码         |          | false    | string             |                    |
| &emsp;&emsp;&emsp;&emsp;examStyle    | 考试形式代码         |          | false    | string             |                    |
| &emsp;&emsp;&emsp;&emsp;courseNature | 课程性质             |          | false    | string             |                    |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 按学期批量推送成绩

**接口地址**:`/v1/base/course-score/push`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求参数**:

暂无

**响应状态**:

| 状态码 | 说明      | schema              |
| ------ | --------- | ------------------- |
| 200    | OK        | BaseResponseBoolean |
| 404    | Not Found | BaseResponseObject  |

**响应状态码-200**:

**响应参数**:

| 参数名称 | 参数说明 | 类型    | schema |
| -------- | -------- | ------- | ------ |
| code     |          | string  |        |
| message  |          | string  |        |
| data     |          | boolean |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": true
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

## 批量保存教学班

**接口地址**:`/v1/base/course-class/batch`

**请求方式**:`POST`

**请求数据类型**:`application/x-www-form-urlencoded,application/json`

**响应数据类型**:`application/json,*/*`

**接口描述**:

**请求示例**:

```javascript
{
  "batchId": "",
  "semesterId": "",
  "courseClasses": [
    {
      "id": "",
      "semesterId": "",
      "courseCode": "",
      "leader": "",
      "name": "",
      "code": "",
      "teachers": "[\"20240451\",\"20240452\"]",
      "stuCodes": "[\"20250201\",\"20250202\"]",
      "scoredTeacher": ""
    }
  ]
}
```

**请求参数**:

| 参数名称                              | 参数说明                 | 请求类型 | 是否必须 | 数据类型                | schema                  |
| ------------------------------------- | ------------------------ | -------- | -------- | ----------------------- | ----------------------- |
| courseClassBatchSaveReq               | 批量保存教学班请求       | body     | true     | CourseClassBatchSaveReq | CourseClassBatchSaveReq |
| &emsp;&emsp;batchId                   | 批次 ID                  |          | true     | string                  |                         |
| &emsp;&emsp;semesterId                | 学期 ID                  |          | true     | string                  |                         |
| &emsp;&emsp;courseClasses             | 教学班列表               |          | true     | array                   | CourseClass             |
| &emsp;&emsp;&emsp;&emsp;id            | 唯一标识 ID              |          | true     | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;semesterId    | 学期 ID                  |          | true     | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;courseCode    | 课程编号                 |          | false    | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;leader        | 课程负责人(教职工工号)   |          | false    | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;name          | 教学班名称               |          | true     | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;code          | 教学班编号               |          | false    | string                  |                         |
| &emsp;&emsp;&emsp;&emsp;teachers      | 授课老师列表(教工号列表) |          | true     | array                   | string                  |
| &emsp;&emsp;&emsp;&emsp;stuCodes      | 学生列表(学号列表)       |          | true     | array                   | string                  |
| &emsp;&emsp;&emsp;&emsp;scoredTeacher | 成绩录入老师(教工号)     |          | false    | string                  |                         |

**响应状态**:

| 状态码 | 说明      | schema                       |
| ------ | --------- | ---------------------------- |
| 200    | OK        | BaseResponseListNoPassResult |
| 404    | Not Found | BaseResponseObject           |

**响应状态码-200**:

**响应参数**:

| 参数名称             | 参数说明    | 类型   | schema       |
| -------------------- | ----------- | ------ | ------------ |
| code                 |             | string |              |
| message              |             | string |              |
| data                 |             | array  | NoPassResult |
| &emsp;&emsp;id       | 唯一标识 ID | string |              |
| &emsp;&emsp;messages | 未通过原因  | array  | string       |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": [
		{
			"id": "",
			"messages": []
		}
	]
}
```

**响应状态码-404**:

**响应参数**:

| 参数名称 | 参数说明 | 类型   | schema |
| -------- | -------- | ------ | ------ |
| code     |          | string |        |
| message  |          | string |        |
| data     |          | object |        |

**响应示例**:

```javascript
{
	"code": "",
	"message": "",
	"data": {}
}
```

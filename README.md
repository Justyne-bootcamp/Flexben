
# Flexben

A small training project for upskilling in NodeJS and AWS.

## API Reference

#### Login

```http
  POST /login
```

Email and password in authorization header. Returns access_token (JWT).
#### Get categories (all)

```http
  GET /categories
```


#### Add reimbursement (employee)

```http
  POST /reimbursement/item/add
```

| Parameter (req.body) | Type     |
| :-------- | :------- |
| `or_number`      | `string` |
| `name_of_establishment`      | `string` |
| `tin_of_establishment`      | `string` |
| `amount`      | `decimal` |
| `category_id`      | `integer` |


#### Get reimbursement collection (employee)

```http
  GET /reimbursement
```

#### Get reimbursement items in a collection (employee)

```http
  GET /reimbursement/items/:reimbursement_id
```

| Parameter (req.params) | Type     |
| :-------- | :------- |
| `reimbursement_id`      | `integer` |


#### Delete a reimbursement item (employee)
```http
  DELETE /reimbursement/item/remove/:item_id
```

| Parameter (req.params) | Type     |
| :-------- | :------- |
| `item_id`      | `integer` |

#### Submit a reimbursement collection (employee)
```http
  POST /reimbursement/submit/:reimbursement_id
```
| Parameter (req.params) | Type     |
| :-------- | :------- |
| `reimbursement_id`      | `integer` |

#### Make a local copy of a reimbursement collection (employee)
```http
  GET /reimbursement/download/:reimbursement_id
```
| Parameter (req.params) | Type     |
| :-------- | :------- |
| `reimbursement_id`      | `integer` |

#### Calculate flex points (employee)
```http
  GET /reimbursement/download/:reimbursement_id
```
| Parameter (req.query) | Type     |
| :-------- | :------- |
| `monthly_rate`      | `decimal` |
| `flex_credits`      | `decimal` |

#### Search reimbursement by employee (hr)
```http
  GET /reimbursement/search
```
| Parameter (req.query) | Type     |
| :-------- | :------- |
| `employee_id`      | `integer` |
| `firstname`      | `string` |
| `lastname`      | `string` |

#### Get reimbursements submitted in a cutt-off cycle (hr)
```http
  GET /reimbursement/:cutoff_id
```
| Parameter (req.params) | Type     |
| :-------- | :------- |
| `cutoff_id`      | `integer` |

#### Approve a reimbursement collection (hr)
```http
  POST /reimbursement/approve/:reimbursement_id
```
| Parameter (req.params) | Type     |
| :-------- | :------- |
| `reimbursement_id`      | `integer` |

#### Reject a reimbursement collection (hr)
```http
  POST /reimbursement/reject/:reimbursement_id
```
| Parameter (req.params) | Type     |
| :-------- | :------- |
| `reimbursement_id`      | `integer` |













## Authors

- [@charleezychang](https://www.github.com/charleezychang)
- [@Justyne-bootcamp](https://www.github.com/Justyne-bootcamp)

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`ACCESS_TOKEN`

`MIN_REIMBURSABLE_AMOUNT`

`TAX_RATE`

`DB_HOST`

`DB_USER`

`DB_PASSWORD`

`DB_DATABASE`


# API

[Author](https://github.com/vinylen2/ellabib-server/blob/master/API.md#author)
[Authors](https://github.com/vinylen2/ellabib-server/blob/master/API.md#authors)
[Book](https://github.com/vinylen2/ellabib-server/blob/master/API.md#Book)
[Books](https://github.com/vinylen2/ellabib-server/blob/master/API.md#Books)
[Review](https://github.com/vinylen2/ellabib-server/blob/master/API.md#Review)
[Reviews](https://github.com/vinylen2/ellabib-server/blob/master/API.md#Reviews)

Author
----
Posts a new author to the database


* **URL**

  /author/

* **Method:**

  `POST`

*  **URL Params**

    None

* **Data Params**

  **Required**

  { name: "Full name" }

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** `{ id : 12, name : "Michael Bloom" }`

* **Error Response:**

  No error responses yet
  <!-- * **Code:** 404 NOT FOUND <br />
    **Content:** `{ error : "User doesn't exist" }`

  OR

  * **Code:** 401 UNAUTHORIZED <br />
    **Content:** `{ error : "You are unauthorized to make this request." }` -->

* **Sample Call:**

  ```javascript
    axios({
      method: 'post',
      url: '/author',
      data: {
        'name',
      },
    });
  ```
Authors
----

Book
----

Books
----

Review
----

Reviews
----

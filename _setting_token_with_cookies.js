/*
using http only cookies 

1. from client side send the information (email, better: firebase er auth token) to generate token
2. on the server side, accept user information and if needed validate it 
3. generate token if the server side using secret and expiresIn


---------------------------

set the cookies
4. while calling the api tell to use withCredentials

axios.post('http://localhost:3000/jwt', userData, {
                    withCredentials: true
                })
5. in the cors setting set credentials and origin

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));

6. after generating the token set it to the cookies with some options

 res.cookie('token', token, {
                httpOnly: true,
                secure: false
            })
                
7. use cookiesParser as middleware
8. in the client side: if using axios withCredentials: true for fetch: credentials include

----------------------------------

verify token now: 
9. check token exists. If not , return 401 ---> unauthorized jwt.verify function.
10. jwt.verify function. If err return 401 ---> unauthorized
11. if token is valid set the decoded value to the req object
12. if data asking for doesn't match with the owner or bearer of the token --> 403 --> forbidden access.


*/ 
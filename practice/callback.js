//callback fucntion

const calculate =  (num1 , num2 , operation)=> {
    return operation(num1 , num2);
}

const result = calculate(3 ,4 ,function (num1 , num2){
    return num1 + num2;

})

console.log(result);

const Sub=  (a , b ) => a - b ; 

const subresult = calculate(3 , 4 ,Sub());

console.log(subresult);
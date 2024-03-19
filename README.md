# flick


<!-- TABLE OF CONTENTS -->
<details open="open">
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a>
        </li>
      </ul>
    </li>
  </ol>
</details>



## About The flick
* Library can be used to capture and send click events in front-end js based applications. The library provides native support for click event tracking for Fynd Platform. Events emitted are sent to platform click data storage.

### Built With
Fremework used to develop sureshot application.
* [NodeJs](https://nodejs.org/en/docs/)
* [Typescript](https://typescript.org/en/docs/)
* Browsers local storage

## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.


### Prerequisites

1. Include NPM packages in package.json
   ```sh
   "@gofynd/flick": "1.0.5",
   ```


### Application Changes 

<a name="developer-guide"> </a>
## Developers guide to send user event
###### Code repo : [flick](https://github.com/gofynd/flick-js.git)
   
# initialize
    1.What is it 
            Static Function which will take apiKey(not optional , it will be compulsory) as an argument . You need to pass the api token when calling this function. apiKey is generated by base64 endcoded string with FP application_id:application_token. 
            Function takes endpoint as an argument. Which is domain for FP.
    2.Arguments
             count=2
             endpoint // required in string form.
             apiKey   // required in string form.
    3.Function Type: 
            Static Public        
    4.What are the two keys 
            Key name == apiKey.   The actual api token.
            Key name == endpoint    This will be host domain for FP. 
 
This is an example of how to call it .
  ```sh
 Stelio.initialize(<endpoint>, <apikey>);
  ```
        

## identify 
      Remember you need to call first initialize other wise it will throw an errror. This function should be triggered on user login, signup, profile update.
    1.What is it
            this will be used for storing user properties like its name , email and other properties. As this will help in analysis at our end. 
    2.Arguments
            count=2 // both optional.
             First is userID which will basically string.   
             Other is Traits which will be an object you need to pass.     
        3.Function Type: 
            Static Public     
        4.What it will do 
            It will basically 
        5.This is an example of how to call it .
  ```sh
 Stelios.identify('8337914792', {name:sourav , email:souravkhurana@xyz.com})
  ```
           

## sendEvent
        Remember you need to call first initialize other wise it will throw an errror..
    1.What it will do.
            Capture and send event on click.
    2.Arguments
             count=2 // both required.
             First is eventType which will basically string.   
             Other is properties of event which will be an object you need to pass.     
    3.Function Type: 
            Static Public  
            4.This is an example of how to call it .
  ```sh
 Stelios.sendEvent('add to cart',{product id: 'uiui',cartItems:'10'})
  ```     

## reset
    Remember you need to call first initialize other wise it will throw an errror..
    1.What is it
            Call it when for example user logouts.
    2.Arguments
            count=0.
    3.Function Type: 
            Static Public  
            4.This is an example of how to call it .
  ```sh
Stelios.reset()
  ```               



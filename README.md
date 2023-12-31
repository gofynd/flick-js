# ![hoist](https://gitlab.com/uploads/-/system/project/avatar/3342672/aggregator-vector-icon-isolated-on-transparent-background-aggregator-logo-concept-P2C4M8.jpg?width=64)  Stelios


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
        <ul> 
        <li> <a href="#application-changes"> Application changes </a>
        <li> <a href="#start-application"> Start Application </a>
        </ul>
        </li>
      </ul>
    </li>
    <li><a href="#type-of-system">Type of System</a></li>
    <li><a href="#developer-guide"> Developers guide</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contact">Contact</a></li>
     <li><a href="#contact">Project Link</a></li>
  </ol>
</details>



## About The Stelios
* Very first version , library would be an alternative for analytics next which was used for tracking the user actions from UI.Here all the events data  related to user action will be sent now on internal FYND data store kafrop or BQ or AWS instead  of    third party tool we were using which was segment.com

###### What's is Stelios: 
* Is an SDk which will store user action in browser local storage.
* It will send in batch all the user events to our FYND data stores. i.e on BQ , AWS etc.

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
   "@types/stelios": "gitlab:fynd/regrowth/data-platform/stelios#testSteliosv1",
    "stelios": "gitlab:fynd/regrowth/data-platform/stelios#testSteliosv1",
   ```


### Application Changes 
<a name="start-application"> </a>
### Start Application in local

This is an example of how to start .
  ```sh
 import {Stelios} from 'stelios'
  ```

<a name="developer-guide"> </a>
## Developers guide to send user event
###### Code repo : [stelios](https://gitlab.com/fynd/regrowth/data-platform/stelios.git)
   
# Initialize
    1.What is it 
            Static Function which will take api Token(not optional , it will be compulsory) as an argument . You need to pass the api token when calling this functin. This will be the very first function we need to call to access the core functionality of stelios. This will then validate the api token (passed by FE). and if token is valid , this will then initialize the two keys in local storage . 
    2.Arguments
             count=1
             apiKey   // required in string form.
    3.Function Type: 
            Static Public        
    4.What are the two keys 
            Key name == apiKey.   The actual api token.
            Key name == identify    This will be object with keys Traits and userID. 
 
This is an example of how to call it .
  ```sh
 Stelio.initialize(<api-token>);
  ```
        

## identify 
      Remember you need to call first initialize other wise it will throw an errror..
    1.What is it
            this will be used for storing user properties like its name , email and other properties. As this will help in analysis at our end. 
    2.Arguments
            count=2 // both optional.
             First is userID which will basically string.   
             Other is Traits which will be an object you need to pass.     
        3.Function Type: 
            Static Public     
        4.What it will do 
            It will basically sets(if not exist) or update(if exists) the userIdentity key in local storage with the arguments passed while function calling. or if not passed it will set the traits property with an empty object and userID property with value `anonymous_${uuidv4()}`
        5.This is an example of how to call it .
  ```sh
 Stelios.identify('839796479',{name:sourav , email:souravkhurana@gofynd.com})
  ```
           

## sendEvent
        Remember you need to call first initialize other wise it will throw an errror..
    1.What it will do.
            It will basically set key stelioEvents in local storage. The key will be an array of events.
            One event will be counted as for ex when user click on add to cart button , FE will call this function with arguments specified below.
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
            this will be used to clear the local storgae keys of stelios . i.e stelioEvents , apiKey , userIdentity.
            Call it when for example user logouts.
    2.Arguments
            count=0.
    3.Function Type: 
            Static Public  
            4.This is an example of how to call it .
  ```sh
Stelios.reset()
  ```     
              
        
## sendBatch
            This will be basically private function which will be executed every 5 sec . It will acess stelioEvents array in local storage . And call the event bus api with that array as payload And that api will actually store that array after processing in kafdrop. Onsuccessful response from api , this will function will then remove the events from the key.





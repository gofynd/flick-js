const Clickstream = require("./dist")


async function test(){
    await Clickstream.initialize("testnk")
    await Clickstream.identify("1", {"email": "nk@gofynd.com"})
    await Clickstream.sendEvent("add_to_cart", { "key1": "Val1" })
}

test()

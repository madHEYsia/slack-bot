// Code to extract urls. Run on https://help.regie.ai/category/getting-started browser console

var links = [];
var sliderIndex = -1;
const scan = () => {
    var timer = setInterval(() => {
        var nodes = document.getElementById("categories-block-wrapper").children;
        for(let i=0; i<nodes.length; i++)
            links.push(nodes[i].children[0].getAttribute("href"));
        var nextBtn = document.getElementsByClassName('page-button')[1];
        if(!nextBtn || nextBtn.getAttribute('disabled')){
            clearInterval(timer);
            var slider = document.getElementsByClassName('vueperslides__track-inner')[0].children;
            if(!slider[++sliderIndex])
                console.log(links);
            else {
                slider[sliderIndex].children[0].children[0].click();
                setTimeout(() => scan(), 3000);                
            }
        }
        else 
            nextBtn.click();
    }, 1000)
}
scan();

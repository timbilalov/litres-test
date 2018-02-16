(function app() {
    // Локальные переменные.
    var parentElem = document.getElementById("app");
    var localLinksCountElem = document.getElementById("local-links-count");
    var lettersCountElem = document.getElementById("total-letters-count");
    var badLinksCountElem = document.getElementById("bad-links-count");
    var errorMsgElem = document.getElementById("error");
    var xmlUrlElem = document.getElementById("xml-url");
    var stateClass1 = "is-state-1";
    var stateClass2 = "is-state-2";
    var stateClass3 = "is-state-3";
    var stateClassError = "is-state-error";
    var parentElemClassList = parentElem.classList;


    var init = function() {
        // Получаем ссылку на XML-документ из get-параметров.
        var xmlUrl = (function getXmlParam() {
            var loc = window.location;
            var query = loc.search.substr(1);
            if (!query) {
                return false;
            }
            var locParams = {};
            query.split("&").forEach(function(part) {
                var split = part.split("=");
                locParams[split[0]] = split[1];
            });

            var xml = locParams["xml"];
            var res;

            // Определяем, правильно ли передан параметр xml.
            // Предполагаем, что файл может быть как локальным, так и удалённым.
            if (xml && (xml.indexOf("/") === 0 || xml.indexOf("./") === 0 || xml.indexOf("http") === 0) && xml.indexOf(".xml") === xml.length - 4) {
                res = xml;
            } else {
                res = false;
            }
            return res;
        })();

        // Выводим сообщение об ошибке, если параметр
        // отсутсвует или задан неверно.
        if (!xmlUrl) {
            console.log("%cmissed xml query parameter (or wrong value)", "color: red");
            parentElemClassList.remove(stateClass1);
            parentElemClassList.add(stateClassError);
            errorMsgElem.textContent = "параметр xml не задан, или его значение неверно (проверьте правильность указанного пути к файлу)";
            return;
        }

        // Отображаем ссылку на документ
        // в теле страницы.
        xmlUrlElem.textContent = xmlUrl;
        xmlUrlElem.href = xmlUrl;

        // Получаем парсер XML.
        var xmlParser = (function getXmlParser() {
            var res;
            if (typeof window.DOMParser != "undefined") {
                res = function(xmlStr) {
                    return ( new window.DOMParser() ).parseFromString(xmlStr, "text/xml");
                };
            } else if (typeof window.ActiveXObject != "undefined" &&
                   new window.ActiveXObject("Microsoft.XMLDOM")) {
                res = function(xmlStr) {
                    var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = "false";
                    xmlDoc.loadXML(xmlStr);
                    return xmlDoc;
                };
            } else {
                res = false;
            }
            return res;
        })();

        // Если возникли проблемы при получения парсера,
        // выводим сообщение об ошибке.
        if (!xmlParser) {
            console.log("%сno xml parser found", "color: red");
            parentElemClassList.remove(stateClass1);
            parentElemClassList.add(stateClassError);
            errorMsgElem.textContent = "ошибка инициализации парсера xml";
            return;
        }

        console.log("xmlUrl: " + xmlUrl);

        // Генерируем запрос к указанному файлу.
        var xhr = new XMLHttpRequest();
        xhr.open("GET", xmlUrl, true);
        var xmlObject;
        xhr.onreadystatechange = function(response) {
            if (xhr.readyState !== 4) {
                return;
            }

            console.log("request done");
            parentElemClassList.remove(stateClass2);

            // Если при загрузке возникли ошибки,
            // то выводим соотвествующее сообщение и прекращаем
            // дальнейшую обработку файла.
            if (xhr.status !== 200) {
                parentElemClassList.add(stateClassError);
                var statusText = xhr.statusText || "ошибка при загрузке файла";
                if (xhr.status === 404) {
                    statusText = "указанный файл не найден";
                }
                errorMsgElem.textContent = statusText;
                return;
            }

            // На всякий случай, оборачиваем парсер в try...catch,
            // и, при возникновении ошибок, выводим соответствующее сообщение.
            try {
                parseXmlData(xmlParser(xhr.responseText));
            } catch(e) {
                console.error(e);
                parentElemClassList.add(stateClassError);
                errorMsgElem.textContent = e;
            }
        }

        console.log("request send");
        // Меняем статус приложения,
        // с "инициализируется" на "идёт обработка".
        parentElemClassList.remove(stateClass1);
        parentElemClassList.add(stateClass2);
        xhr.send();
    };

    // Парсим XML-данные.
    var parseXmlData = function(xml) {
        if (!xml || typeof xml !== "object") {
            return;
        }

        var documentElement = xml.documentElement;

        // Задача 1: получение количества локальных ссылок.
        var allLinks = documentElement.querySelectorAll("a");
        var localLinks = Array.prototype.filter.call(allLinks, function(link) {
            return link.getAttribute("l:href") && link.getAttribute("l:href").indexOf("#") === 0;
        });
        var localLinksCount = localLinks.length;
        console.log("localLinksCount: " + localLinksCount);
        localLinksCountElem.textContent = localLinksCount;

        // Задача 2: получение количества букв в тегах.
        // NOTE: Возможно, что :scope * - не самый правильный вариант
        // получить все дочерние элементы.
        // Но зато - самый простой.
        var childNodes = documentElement.querySelectorAll(':scope *');;
        var lettersCount = 0;
        Array.prototype.forEach.call(childNodes, function(elem) {
            var textContent = elem.textContent;
            if (!textContent || typeof textContent !== "string") {
                return;
            }
            var textContentLetters = textContent.replace(/\s/g, "");
            lettersCount += textContentLetters.length;
        });
        console.log("lettersCount: " + lettersCount);
        lettersCountElem.textContent = lettersCount;

        // Задача 3: получение количества битых ссылок.
        var badLinksCount = 0;
        Array.prototype.forEach.call(localLinks, function(link) {
            var href = link.getAttribute("l:href").trim();
            if (!documentElement.querySelector(href)) {
                badLinksCount += 1;
            }
        });
        console.log("badLinksCount: " + badLinksCount);
        badLinksCountElem.textContent = badLinksCount;

        // Когда все задачи выполнены,
        // переводим статус приложения
        // с "идёт обработка" на "полученный результат".
        parentElemClassList.add(stateClass3);
    };

    // Чтобы для тех, у кого хороший инет, не мелькала начальная фраза
    // о загрузке приложения
    // (психологический эффект).
    setTimeout(init, 1000);
})();
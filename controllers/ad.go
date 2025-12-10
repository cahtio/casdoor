package controllers

func (c *ApiController) Ads() {
	var ads = []interface{}{
		map[string]string{
			"url":      "https://oauth.caht.io/files/resource/built-in/admin/1.jpg",
			"redirect": "http://ai.caht.ai",
		},
	}
	c.ResponseOk(ads)
	return
}

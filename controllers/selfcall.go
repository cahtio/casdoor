package controllers

func (c *ApiController) AppCallback() {
	accessToken := c.Input().Get("access_token")
	c.ResponseOk("token", accessToken)
}

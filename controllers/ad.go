package controllers

import (
	"github.com/casdoor/casdoor/object"
	"github.com/hashicorp/go-version"
	jsoniter "github.com/json-iterator/go"
)

func (c *ApiController) Ads() {

	var ads = []interface{}{
		map[string]string{
			"url":      "https://adm.starlive.com/assets/087AC4D233B64EB0logo.DZmC_x5v.png",
			"redirect": "https://testnet.cahtx.com/trade/BTC_USDC",
		},
	}

	appVersion := c.Input().Get("version")
	store_version := c.Input().Get("store_version")
	if appVersion == "" && store_version == "" { // 旧版 一律通过
		c.ResponseOk(ads)
		return
	}

	// onlineVersion, err := c.getOnlineVersion("cahtio")
	// if err != nil {
	// 	c.ResponseError(err.Error())
	// 	return
	// }

	v1, _ := version.NewVersion(appVersion)
	v2, _ := version.NewVersion(store_version)
	if v1.GreaterThan(v2) {
		c.ResponseError("new version available v1: " + v1.String() + " v2: " + v2.String())
		ads = []interface{}{
			map[string]string{
				"url":      "https://adm.starlive.com/assets/087AC4D233B64EB0logo.DZmC_x5v.png",
				"redirect": "https://caht.io",
			},
		}
		return
	}
	c.ResponseOk(ads)
	return
}

func (c *ApiController) getOnlineVersion(owner string) (string, error) {
	applications, err := object.GetApplications(owner)
	if err != nil {
		c.ResponseError(err.Error())
		return "", err
	}
	if len(applications) == 0 {
		c.ResponseError("no application found")
		return "", nil
	}
	for _, application := range applications {
		if application.Name == "CaHtioIM" {
			extra := make(map[string]string)
			if application.Description != "" {
				if err := jsoniter.Unmarshal([]byte(application.Description), &extra); err != nil {
					c.ResponseError(err.Error())
					return "", err
				}
			}
			onlineVersion := extra["version"]
			return onlineVersion, nil
		}
	}
	c.ResponseError("no application found")
	return "", nil
}

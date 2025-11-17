// Copyright 2021 The Casdoor Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package object

import (
	"encoding/json"
	"fmt"
	"strings"

	openapi "github.com/alibabacloud-go/darabonba-openapi/v2/client"
	dysmsapi20180501 "github.com/alibabacloud-go/dysmsapi-20180501/v2/client"
	"github.com/alibabacloud-go/tea/tea"
	credential "github.com/aliyun/credentials-go/credentials"
	"github.com/casdoor/casdoor/conf"
	sender "github.com/casdoor/go-sms-sender"
)

func getSmsClient(provider *Provider) (sender.SmsClient, error) {
	var client sender.SmsClient
	var err error

	if provider.Type == sender.HuaweiCloud || provider.Type == sender.AzureACS {
		client, err = sender.NewSmsClient(provider.Type, provider.ClientId, provider.ClientSecret, provider.SignName, provider.TemplateCode, provider.ProviderUrl, provider.AppId)
	} else if provider.Type == "Custom HTTP SMS" {
		client, err = newHttpSmsClient(provider.Endpoint, provider.Method, provider.Title, provider.TemplateCode)
	} else {
		client, err = sender.NewSmsClient(provider.Type, provider.ClientId, provider.ClientSecret, provider.SignName, provider.TemplateCode, provider.AppId)
	}
	if err != nil {
		return nil, err
	}

	return client, nil
}

func SendSms(provider *Provider, content string, phoneNumbers ...string) error {
	client, err := getSmsClient(provider)
	if err != nil {
		return err
	}

	if provider.Type == sender.Twilio {
		if provider.AppId != "" {
			phoneNumbers = append([]string{provider.AppId}, phoneNumbers...)
		}
	} else if provider.Type == sender.Aliyun {
		for i, number := range phoneNumbers {
			phoneNumbers[i] = strings.TrimPrefix(number, "+86")
		}
	}

	params := map[string]string{}
	if provider.Type == sender.TencentCloud {
		params["0"] = content
	} else {
		params["code"] = content
	}

	err = client.SendMessage(params, phoneNumbers...)
	return err
}

func SendSmsGlobe(message string, phoneNumber string) error {
	type aliyunConfig struct {
		Region          string `json:"region"`
		SignName        string `json:"signName"`
		AccessKeyId     string `json:"accessKeyId"`
		AccessKeySecret string `json:"accessKeySecret"`
	}

	aliConfig := aliyunConfig{}
	err := json.Unmarshal([]byte(conf.GetConfigString("AliyunSms")), &aliConfig)
	if err != nil {
		return fmt.Errorf("error unmarshal aliyun config: %w", err)
	}
	config := new(credential.Config).
		SetType("access_key").
		SetAccessKeyId(aliConfig.AccessKeyId).
		SetAccessKeySecret(aliConfig.AccessKeySecret)

	newCredential, _err := credential.NewCredential(config)
	if _err != nil {
		return fmt.Errorf("error create aliyun credential: %w", _err)
	}

	configs := &openapi.Config{
		Credential: newCredential,
	}
	// Endpoint 请参考 https://api.aliyun.com/product/Dysmsapi
	configs.Endpoint = tea.String("dysmsapi.ap-southeast-1.aliyuncs.com")
	client, _err := dysmsapi20180501.NewClient(configs)
	if _err != nil {
		return fmt.Errorf("error create aliyun client: %w", _err)
	}

	sendMessageToGlobeRequest := &dysmsapi20180501.SendMessageToGlobeRequest{
		To:      tea.String(phoneNumber),
		Message: tea.String(message),
	}

	_, _err = client.SendMessageToGlobe(sendMessageToGlobeRequest)
	if _err != nil {
		return fmt.Errorf("error send sms globe: %w", _err)
	}

	return nil
}

func GetInviteSmsTemplate(inviter, invitee, inviteCode, lang string) (string, error) {
	var template string
	switch lang {
	case "cn":
		template = `【CaHt】 嗨，{invitee}！我正在使用一款超棒的全新聊天应用 CaHt，{inviter} 诚挚邀请您的加入！快来和我们一起体验快速、有趣的沟通方式吧！

点击注册：https://oauth.caht.io/signup/CaHtioIM?invite={inviteCode}

期待在 CaHt 上与您相见！`
	default:
		template = `[CaHt] Hi there, {invitee}! I'm using an awesome new chat app called CaHt,  {inviter} sincerely invites you to join! Come experience fast and fun communication with us!

Click to register: https://oauth.caht.io/signup/CaHtioIM?invite={inviteCode}

Looking forward to seeing you on CaHt!`
	}

	params := map[string]string{
		"inviteCode": inviteCode,
		"inviter":    inviter,
		"invitee":    invitee,
	}
	renderedTemplate := template
	for key, value := range params {
		renderedTemplate = strings.ReplaceAll(renderedTemplate, "{"+key+"}", value)
	}
	return renderedTemplate, nil
}

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

package controllers

import (
	"encoding/json"

	"github.com/casdoor/casdoor/object"
)

func (c *ApiController) UpdateUser2() {
	oldUser, ok := c.RequireSignedInUser()
	if !ok {
		return
	}

	var updateUser object.User
	var columns = []string{}

	err := json.Unmarshal(c.Ctx.Input.RequestBody, &updateUser)
	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if updateUser.Avatar != "" {
		columns = append(columns, "avatar")
	}

	if updateUser.DisplayName != "" {
		columns = append(columns, "display_name")
	}

	if updateUser.Gender != "" {
		columns = append(columns, "gender")
	}

	if msg := object.CheckUpdateUser(oldUser, &updateUser, c.GetAcceptLanguage()); msg != "" {
		c.ResponseError(msg)
		return
	}
	id := oldUser.Owner + "/" + oldUser.Name
	affected, err := object.UpdateUser(id, &updateUser, columns, false)

	if err != nil {
		c.ResponseError(err.Error())
		return
	}

	if affected {
		err = object.UpdateUserToOriginalDatabase(&updateUser)
		if err != nil {
			c.ResponseError(err.Error())
			return
		}
	}

	c.Data["json"] = wrapActionResponse(affected)
	c.ServeJSON()
}

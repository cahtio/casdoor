// Copyright 2023 The Casdoor Authors. All Rights Reserved.
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

type UserInvite struct {
	DisplayName string `json:"name,omitempty"`
	Email       string `json:"email,omitempty"`
	Phone       string `json:"phone,omitempty"`
	Avatar      string `json:"picture,omitempty"`
	Code        string `json:"code,omitempty"`
	CreateTime  string `json:"createTime,omitempty"`
}

func GetUserInvites(id string) ([]*UserInvite, error) {
	var users []*User
	err := ormer.Engine.Where("pid = ?", id).Desc("created_time").Find(&users)
	if err != nil {
		return nil, err
	}
	invites := make([]*UserInvite, 0)
	for _, user := range users {
		invites = append(invites, &UserInvite{
			DisplayName: user.DisplayName,
			//Email:       user.Email,
			//Phone:       user.Phone,
			Avatar:     user.Avatar,
			CreateTime: user.CreatedTime,
			//Code:    user.Code,
			//Code:        user.Code,
		})
	}
	return invites, nil
}

package util

import (
	"strconv"
	"strings"
)

func CompareVersion(v1, v2 string) int {
	parts1 := strings.Split(v1, ".")
	parts2 := strings.Split(v2, ".")

	// 使两个版本号部分长度一致
	maxLen := len(parts1)
	if len(parts2) > maxLen {
		maxLen = len(parts2)
	}

	// 补全较短的版本号
	for i := len(parts1); i < maxLen; i++ {
		parts1 = append(parts1, "0")
	}
	for i := len(parts2); i < maxLen; i++ {
		parts2 = append(parts2, "0")
	}

	// 逐部分比较
	for i := 0; i < maxLen; i++ {
		num1, _ := strconv.Atoi(parts1[i])
		num2, _ := strconv.Atoi(parts2[i])

		if num1 < num2 {
			return -1
		} else if num1 > num2 {
			return 1
		}
	}

	return 0
}

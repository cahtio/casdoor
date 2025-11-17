package util

import (
	"time"

	"github.com/patrickmn/go-cache"
)

// Cache 基于go-cache封装的缓存工具
type Cache struct {
	cache *cache.Cache
}

// NewCache 创建缓存实例
// defaultExpiration: 默认过期时间
// cleanupInterval: 清理间隔
func NewCache(defaultExpiration, cleanupInterval time.Duration) *Cache {
	return &Cache{
		cache: cache.New(defaultExpiration, cleanupInterval),
	}
}

// Set 设置缓存
func (c *Cache) Set(key string, value interface{}, expiration time.Duration) {
	c.cache.Set(key, value, expiration)
}

// Get 获取缓存
func (c *Cache) Get(key string) (interface{}, bool) {
	return c.cache.Get(key)
}

// Delete 删除缓存
func (c *Cache) Delete(key string) {
	c.cache.Delete(key)
}

// Increment 计数器递增
func (c *Cache) Increment(key string, expiration time.Duration) int {
	count, found := c.cache.Get(key)
	if !found {
		c.cache.Set(key, 1, expiration)
		return 1
	}
	newCount := count.(int) + 1
	c.cache.Set(key, newCount, expiration)
	return newCount
}

// GetCount 获取计数器值
func (c *Cache) GetCount(key string) int {
	count, found := c.cache.Get(key)
	if !found {
		return 0
	}
	return count.(int)
}

// Has 检查key是否存在
func (c *Cache) Has(key string) bool {
	_, found := c.cache.Get(key)
	return found
}

// SetWithFunc 设置带过期时间的值，如果已存在则执行函数
func (c *Cache) SetWithFunc(key string, value interface{}, expiration time.Duration, existFunc func(oldValue interface{}) interface{}) {
	oldValue, found := c.cache.Get(key)
	if found && existFunc != nil {
		value = existFunc(oldValue)
	}
	c.cache.Set(key, value, expiration)
}
